export type Role = 'admin' | 'hr' | 'manager' | 'employee';

export type User = {
    id: number;
    name: string;
    email: string;
    role: Role;
};

export type Employee = {
    id: number;
    user_id?: number | null;
    department_id?: number;
    position_id?: number;
    manager_id?: number | null;
    employee_number?: string;
    first_name?: string;
    middle_name?: string | null;
    last_name?: string;
    date_of_birth?: string | null;
    gender?: string | null;
    profile_photo_path?: string | null;
    full_name: string;
    avatar_url?: string | null;
    work_email?: string | null;
    personal_email?: string | null;
    phone?: string | null;
    residential_address?: string | null;
    city_region?: string | null;
    hire_date?: string | null;
    employment_type?: string;
    status?: string;
    work_location?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_relationship?: string | null;
    emergency_contact_phone?: string | null;
    basic_salary?: string;
    currency?: string;
    bank_name?: string | null;
    bank_account_name?: string | null;
    bank_account_number?: string | null;
    tax_reference?: string | null;
    ssnit_reference?: string | null;
    department?: (Pick<Department, 'id' | 'name' | 'code'> & { manager?: Employee | null }) | null;
    position?: Pick<Position, 'id' | 'title'> | null;
    manager?: Employee | null;
    user?: User | null;
    leave_requests_count?: number;
    attendance_records_count?: number;
    payroll_items_count?: number;
};

export type EmployeeProfile = Employee & {
    user_id: number | null;
    department_id: number;
    position_id: number;
    manager_id: number | null;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    date_of_birth: string | null;
    gender: string | null;
    profile_photo_path: string | null;
    avatar_url: string | null;
    profile_photo_url: string | null;
    personal_email: string | null;
    residential_address: string | null;
    city_region: string | null;
    hire_date: string;
    employment_type: string;
    work_location: string | null;
    emergency_contact_name: string | null;
    emergency_contact_relationship: string | null;
    emergency_contact_phone: string | null;
    basic_salary: string;
    currency: string;
    bank_name: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    tax_reference: string | null;
    ssnit_reference: string | null;
    subordinates: Employee[];
    leave_balances: LeaveBalance[];
    leave_requests: LeaveRequest[];
    attendance_records: AttendanceRecord[];
    payroll_items: PayrollItem[];
};

export type LeaveType = {
    id: number;
    name: string;
    annual_allowance_days: number;
    color: string | null;
    is_paid: boolean;
    is_active: boolean;
    balances_count?: number;
    requests_count?: number;
    created_at?: string | null;
};

export type LeaveBalance = {
    id: number;
    employee_id: number;
    leave_type_id: number;
    year: number;
    entitled_days: number | string;
    used_days: number | string;
    adjusted_days: number | string;
    remaining_days?: number | string;
    leave_type: LeaveType | null;
};

export type LeaveRequest = {
    id: number;
    leave_type?: LeaveType | null;
    approver?: Employee | null;
    start_date: string;
    end_date: string;
    requested_days: number | string;
    status: string;
    reason: string | null;
};

export type AttendanceRecord = {
    id: number;
    work_date: string;
    clock_in_at: string | null;
    clock_out_at: string | null;
    status: string;
};

export type PayrollItem = {
    id: number;
    gross_pay: string;
    net_pay: string;
    deductions_total: string;
    payroll?: {
        id: number;
        month: number;
        year: number;
        status: string;
    } | null;
};

export type Department = {
    id: number;
    name: string;
    code: string;
    description: string | null;
    is_active: boolean;
    manager_id: number | null;
    manager: Employee | null;
    employees_count: number;
    positions_count: number;
    created_at: string | null;
};

export type Position = {
    id: number;
    department_id: number | null;
    department: Pick<Department, 'id' | 'name'> | null;
    title: string;
    code: string;
    description: string | null;
    is_active: boolean;
    employees_count: number;
    created_at: string | null;
};

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export type Paginated<T> = {
    data: T[];
    current_page: number;
    first_page_url: string;
    from: number | null;
    last_page: number;
    last_page_url: string;
    links: PaginationLink[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number | null;
    total: number;
};

export type PageProps = {
    auth: {
        user: User | null;
    };
    flash: {
        success?: string | null;
        error?: string | null;
    };
};
