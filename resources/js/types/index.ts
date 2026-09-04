export type Role = 'admin' | 'hr' | 'manager' | 'employee';

export type User = {
    id: number;
    name: string;
    email: string;
    role: Role;
};

export type Employee = {
    id: number;
    full_name: string;
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
