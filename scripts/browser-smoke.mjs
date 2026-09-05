import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createServer } from 'node:net';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localPhp = path.join(homedir(), '.codex/runtimes/php83/php.exe');
const php = process.env.PHP_BINARY || (existsSync(localPhp) ? localPhp : 'php');
const fixture = JSON.parse(
    (
        await promisify(execFile)(php, ['scripts/browser-fixture.php'], {
            cwd: root,
        })
    ).stdout,
);
const portProbe = createServer();
await new Promise((resolve) => portProbe.listen(0, '127.0.0.1', resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn(
    php,
    [
        '-S',
        `127.0.0.1:${port}`,
        path.join(
            root,
            'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php',
        ),
    ],
    {
        cwd: path.join(root, 'public'),
        windowsHide: true,
        env: { ...process.env, ...fixture.env, APP_URL: base },
        stdio: ['ignore', 'pipe', 'pipe'],
    },
);
let serverOutput = '';
server.stdout.on('data', (data) => {
    serverOutput = (serverOutput + data).slice(-12000);
});
server.stderr.on('data', (data) => {
    serverOutput = (serverOutput + data).slice(-12000);
});
let browser;
const output = path.join(root, 'storage/framework/testing/browser');
await mkdir(output, { recursive: true });

try {
    for (let attempt = 0; attempt < 100; attempt++) {
        try {
            if ((await fetch(`${base}/login`)).ok) break;
        } catch {}
        if (attempt === 99)
            throw new Error(`Preview failed to start: ${serverOutput}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    browser = await chromium.launch({
        channel:
            process.env.BROWSER_CHANNEL ||
            (process.platform === 'win32' ? 'msedge' : undefined),
        headless: true,
    });
    const errors = [];
    async function login(role, width = 1440) {
        const context = await browser.newContext({
            viewport: { width, height: 900 },
        });
        const page = await context.newPage();
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);
        console.log(`Signing in as ${role}`);
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${base}/login`);
        await page
            .getByLabel('Email', { exact: true })
            .fill(`${role}@browser.test`);
        await page
            .getByLabel('Password', { exact: true })
            .fill('browser-test-password');
        await page
            .getByRole('button', { name: 'Sign In', exact: true })
            .click();
        await page.waitForURL(base + '/');
        return page;
    }
    async function visit(page, route) {
        console.log(`Checking ${route}`);
        const response = await page.goto(base + route);
        assert.equal(response.status(), 200, route);
        await page.locator('h1').waitFor();
    }
    async function noOverflow(page) {
        assert(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `Horizontal overflow at ${page.url()}`,
        );
    }
    const employee = await login('employee', 390);
    await employee.getByRole('button', { name: 'Open navigation' }).click();
    await employee
        .locator('#mobile-navigation')
        .getByRole('link', { name: 'My Attendance', exact: true })
        .click();
    await employee.waitForURL('**/self-service/attendance');
    assert(
        await employee
            .getByRole('button', { name: 'Clock Out', exact: true })
            .isDisabled(),
    );
    await employee
        .getByRole('button', { name: 'Clock In', exact: true })
        .click();
    await employee
        .getByText('You are clocked in. Have a good shift.', { exact: true })
        .waitFor();
    assert(
        await employee
            .getByRole('button', { name: 'Clock In', exact: true })
            .isDisabled(),
    );
    await employee
        .getByRole('button', { name: 'Clock Out', exact: true })
        .click();
    await employee
        .getByText('You are clocked out. Nice work today.', { exact: true })
        .waitFor();
    await noOverflow(employee);
    await employee.screenshot({
        path: path.join(output, 'mobile-attendance.png'),
        fullPage: true,
    });
    await visit(employee, '/staff/leave-requests');
    await employee
        .getByRole('button', { name: 'New Request', exact: true })
        .click();
    await employee
        .getByLabel(/^Leave Type/)
        .selectOption(String(fixture.leave_type_id));
    const year = new Date().getFullYear();
    await employee
        .getByLabel('Start Date', { exact: true })
        .fill(`${year}-10-10`);
    await employee
        .getByLabel('End Date', { exact: true })
        .fill(`${year}-10-12`);
    await employee
        .getByLabel('Reason', { exact: true })
        .fill('Browser test leave');
    await employee
        .getByRole('button', { name: 'Submit Request', exact: true })
        .click();
    await employee
        .getByText('Leave request submitted.', { exact: true })
        .waitFor();
    assert.equal(
        await employee
            .getByRole('button', { name: 'Approve', exact: true })
            .count(),
        0,
    );
    assert.equal(
        (await employee.goto(base + '/staff/employees')).status(),
        403,
    );
    const manager = await login('manager');
    await visit(manager, '/staff/leave-requests');
    await manager.getByRole('button', { name: 'Approve', exact: true }).click();
    await manager
        .getByRole('button', { name: 'Approve', exact: true })
        .last()
        .click();
    await manager
        .getByText('Leave request approved and balance updated.', {
            exact: true,
        })
        .waitFor();
    await manager.getByRole('cell', { name: '17', exact: true }).waitFor();
    await visit(manager, '/manager/team');
    assert.equal(await manager.locator('article').count(), 1);
    await visit(manager, '/manager/attendance');
    assert.equal(await manager.locator('tbody tr').count(), 1);
    const admin = await login('admin');
    await admin.screenshot({
        path: path.join(output, 'desktop-dashboard.png'),
        fullPage: true,
    });
    await visit(admin, '/staff/attendance');
    assert.equal(await admin.locator('tbody tr').count(), 4);
    await admin.getByLabel('Work Date').fill(`${year}-09-01`);
    await admin.waitForURL(url => url.pathname === '/staff/attendance' && url.searchParams.get('date') === `${year}-09-01`);
    await visit(admin, '/staff/employees');
    await admin.getByLabel('Admin Person', { exact: true }).waitFor();
    assert(
        await admin
            .locator('img')
            .evaluateAll((images) =>
                images.every(
                    (image) => image.complete && image.naturalWidth > 0,
                ),
            ),
    );
    const employeeDownload = admin.waitForEvent('download');
    await admin.getByRole('link', { name: /Export/ }).click();
    assert((await employeeDownload).suggestedFilename().endsWith('.csv'));
    await visit(admin, '/staff/payroll');
    await admin
        .getByRole('button', { name: 'Run Payroll', exact: true })
        .click();
    await admin
        .getByText(
            'Payroll run complete. 4 payslips generated, 0 already paid.',
            { exact: true },
        )
        .waitFor();
    await admin
        .getByRole('button', { name: 'Run Payroll', exact: true })
        .click();
    await admin
        .getByText(
            'Payroll run complete. 0 payslips generated, 4 already paid.',
            { exact: true },
        )
        .waitFor();
    const popupPromise = admin.waitForEvent('popup');
    await admin
        .getByRole('link', { name: 'Print Payslip', exact: true })
        .first()
        .click();
    const payslip = await popupPromise;
    await payslip.waitForLoadState();
    await payslip.pdf({
        path: path.join(output, 'payslip.pdf'),
        format: 'A4',
        printBackground: true,
    });
    assert(
        (await readFile(path.join(output, 'payslip.pdf')))
            .subarray(0, 4)
            .toString() === '%PDF',
    );
    await visit(admin, '/admin/users');
    await admin
        .getByRole('button', { name: 'Add account', exact: true })
        .click();
    await admin.getByLabel('Name', { exact: true }).fill('Browser New Account');
    await admin.getByLabel('Email', { exact: true }).fill('new@browser.test');
    await admin
        .getByLabel('Password', { exact: true })
        .fill('new-test-password');
    await admin
        .getByLabel('Confirm Password', { exact: true })
        .fill('new-test-password');
    await admin
        .getByRole('button', { name: 'Save Account', exact: true })
        .click();
    await admin.getByText('Account created.', { exact: true }).waitFor();
    await admin
        .getByRole('button', { name: 'Edit Browser New Account', exact: true })
        .click();
    await admin.getByLabel(/^Role/).selectOption('hr');
    await admin
        .getByRole('button', { name: 'Save Account', exact: true })
        .click();
    await admin.getByText('Account updated.', { exact: true }).waitFor();
    await admin
        .getByRole('button', {
            name: 'Delete Browser New Account',
            exact: true,
        })
        .click();
    await admin
        .getByRole('button', { name: 'Delete Account', exact: true })
        .click();
    await admin.getByText('Account deleted.', { exact: true }).waitFor();
    for (const [route, term, expected] of [
        ['/admin/users', 'employee@browser.test', 'employee@browser.test'],
        ['/staff/employees', 'Employee Person', 'Employee Person'],
        ['/organization/departments', 'Engineering', 'Engineering'],
        ['/organization/positions', 'Engineer', 'Engineer'],
        ['/staff/attendance', 'Employee Person', 'Employee Person'],
        ['/staff/payroll', 'Employee Person', 'Employee Person'],
        ['/staff/leave-requests', 'Employee Person', 'Employee Person'],
        ['/staff/leave-types', 'Annual', 'Annual'],
    ]) {
        await visit(admin, route);
        const search = admin.getByRole('search').getByRole('searchbox');
        await search.fill(term);
        await search.press('Enter');
        await admin.waitForURL(url => url.searchParams.get('search') === term);
        assert((await admin.locator('main').textContent()).includes(expected));
        await search.fill('NoSuchPersonXYZ');
        await admin.getByRole('button', { name: 'Search', exact: true }).click();
        await admin.waitForURL(url => url.searchParams.get('search') === 'NoSuchPersonXYZ');
        assert.equal(await admin.locator('tbody tr').filter({ hasText: expected }).count(), 0);
        await admin.getByRole('button', { name: 'Clear search' }).click();
        await admin.waitForURL(url => !url.searchParams.get('search'));
        await noOverflow(admin);
    }
    await visit(admin, '/staff/employees');
    await admin.getByRole('button', { name: 'Add Employee', exact: true }).click();
    await admin.getByLabel('Search manager options', { exact: true }).fill('Manager Person');
    const managerSelect = admin.getByLabel('Manager', { exact: true });
    assert.equal(await managerSelect.locator('option').count(), 2);
    await managerSelect.selectOption({ label: 'Manager Person' });
    const selectedManager = await managerSelect.inputValue();
    await admin.getByLabel('Search manager options', { exact: true }).fill('Nobody');
    assert.equal(await managerSelect.inputValue(), selectedManager);
    await admin.getByRole('button', { name: 'Close', exact: true }).click();
    await visit(admin, '/admin/company');
    await admin.getByLabel('Company Name', { exact: true }).fill('Acme People Operations');
    await admin.getByLabel('Subtitle', { exact: true }).fill('Our people, our company');
    await admin.getByLabel('Company Email', { exact: true }).fill('office@acme.test');
    await admin.getByLabel('Company Address', { exact: true }).fill('10 Main Street\nAccra');
    await admin.getByLabel('Registration Number', { exact: true }).fill('REG-123');
    await admin.getByRole('button', { name: 'Save Changes' }).click();
    await admin.getByText('Company details updated.', { exact: true }).waitFor();
    await admin.waitForFunction(() => document.title === 'Company Settings - Acme People Operations');
    await admin.screenshot({ path: path.join(output, 'company-settings-desktop.png'), fullPage: true });
    await visit(admin, '/staff/payroll');
    const brandedPopup = admin.waitForEvent('popup');
    await admin.getByRole('link', { name: 'Print Payslip', exact: true }).first().click();
    const brandedPayslip = await brandedPopup;
    await brandedPayslip.getByRole('heading', { name: 'Acme People Operations', exact: true }).waitFor();
    await brandedPayslip.getByText('REG-123', { exact: true }).waitFor();
    await brandedPayslip.screenshot({ path: path.join(output, 'company-payslip.png'), fullPage: true });
    await brandedPayslip.close();
    assert.equal((await manager.goto(base + '/admin/company')).status(), 403);
    for (const width of [390, 1440]) {
        await admin.setViewportSize({ width, height: 900 });
        for (const route of [
            '/',
            '/admin/users',
            '/admin/company',
            '/staff/attendance',
            '/staff/employees',
            '/organization/departments',
            '/organization/positions',
            '/staff/leave-types',
            '/staff/leave-requests',
            '/self-service/profile',
        ]) {
            await visit(admin, route);
            await noOverflow(admin);
            if (route === '/admin/company' || route === '/admin/users') {
                await admin.screenshot({ path: path.join(output, `${route.endsWith('company') ? 'company-settings' : 'account-search'}-${width}.png`), fullPage: true });
            }
        }
        await admin.screenshot({
            path: path.join(output, `profile-${width}.png`),
            fullPage: true,
        });
    }
    await employee.goto(base + '/self-service/profile');
    await employee
        .getByRole('button', { name: 'Sign out', exact: true })
        .click();
    await employee.waitForURL('**/login');
    await employee.getByRole('heading', { name: 'Acme People Operations', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log(
        'Browser checks passed: authentication, mobile navigation, leave approval and balance, attendance, accounts, exports, duplicate payroll, PDF, avatar fallback, search, company settings and dynamic branding, responsive pages.',
    );
} catch (error) {
    for (const [index, context] of (browser?.contexts() ?? []).entries()) {
        const page = context.pages()[0];
        if (page)
            await page
                .screenshot({
                    path: path.join(output, `failure-${index}.png`),
                    fullPage: true,
                })
                .catch(() => {});
    }
    console.error(serverOutput.slice(-3000));
    throw error;
} finally {
    await browser?.close();
    server.kill();
    await new Promise((resolve) => server.once('exit', resolve));
    await unlink(fixture.env.DB_DATABASE);
}
