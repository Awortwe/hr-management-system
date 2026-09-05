export type Role = 'admin' | 'hr' | 'manager' | 'employee';

export type User = {
    id: number;
    name: string;
    email: string;
    role: Role;
};

export type Employee = {
    id: number;
    employee_number?: string;
    full_name: string;
    work_email?: string | null;
    phone?: string | null;
    status?: string;
    department?: Pick<Department, 'id' | 'name' | 'code'> | null;
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
    leave_balances: unknown[];
    leave_requests: unknown[];
    attendance_records: unknown[];
    payroll_items: unknown[];
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
