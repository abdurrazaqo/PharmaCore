# PharmaCore Authentication & RBAC - System Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     PHARMACORE APPLICATION                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Login      │───▶│  Dashboard   │───▶│  Protected   │  │
│  │   Page       │    │              │    │  Routes      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         ▼                    ▼                    ▼          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │            AuthContext (Global State)                │   │
│  │  • user: User | null                                 │   │
│  │  • profile: UserProfile | null                       │   │
│  │  • isLoading: boolean                                │   │
│  │  • logout()                                          │   │
│  │  • requireRole()                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Permission System (usePermissions)           │   │
│  │  • hasPermission(permission)                         │   │
│  │  • hasAnyPermission([...])                           │   │
│  │  • hasAllPermissions([...])                          │   │
│  └─────────────────────────────────────────────────────┘   │
│         │                                                    │
│         ▼                                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              UI Components                           │   │
│  │  • PermissionGate                                    │   │
│  │  • RoleBasedRoute                                    │   │
│  │  • ProtectedRoute                                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────┬───────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE BACKEND                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Authentication (auth.users)              │  │
│  │  • Email/Password authentication                      │  │
│  │  • Session management                                 │  │
│  │  • JWT tokens                                         │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database Tables                          │  │
│  │                                                        │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │  │
│  │  │   users    │  │  tenants   │  │  branches  │     │  │
│  │  ├────────────┤  ├────────────┤  ├────────────┤     │  │
│  │  │ id         │  │ id         │  │ id         │     │  │
│  │  │ tenant_id  │  │ name       │  │ tenant_id  │     │  │
│  │  │ role       │  │ subdomain  │  │ name       │     │  │
│  │  │ branch_id  │  └────────────┘  │ location   │     │  │
│  │  └────────────┘                  └────────────┘     │  │
│  │                                                        │  │
│  │  ┌────────────────────────────────────────────────┐  │  │
│  │  │           audit_logs                            │  │  │
│  │  ├────────────────────────────────────────────────┤  │  │
│  │  │ id, tenant_id, user_id, action                 │  │  │
│  │  │ resource_type, resource_id                     │  │  │
│  │  │ old_values, new_values, metadata               │  │  │
│  │  └────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│         │                                                    │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Row Level Security (RLS) Policies             │  │
│  │  • Tenant data isolation                              │  │
│  │  • Role-based access control                          │  │
│  │  • Automatic enforcement                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Authentication Flow

```
┌──────────┐
│  User    │
└────┬─────┘
     │
     │ 1. Enter username/password
     ▼
┌─────────────────┐
│  Login Page     │
└────┬────────────┘
     │
     │ 2. Convert username to email format
     │    (username@pharmacore.local)
     ▼
┌─────────────────┐
│ Supabase Auth   │
└────┬────────────┘
     │
     │ 3. Validate credentials
     │ 4. Create session + JWT token
     ▼
┌─────────────────┐
│  AuthContext    │
└────┬────────────┘
     │
     │ 5. Fetch user profile from users table
     │    (tenant_id, role, branch_id)
     ▼
┌─────────────────┐
│  Store in       │
│  Context        │
└────┬────────────┘
     │
     │ 6. Redirect to dashboard
     ▼
┌─────────────────┐
│  Protected      │
│  Routes         │
└─────────────────┘
```

## 🔐 Permission Check Flow

```
┌──────────────────┐
│  User Action     │
│  (e.g., Edit)    │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Component       │
│  Checks          │
│  Permission      │
└────┬─────────────┘
     │
     │ hasPermission(Permission.EDIT_PRODUCTS)
     ▼
┌──────────────────┐
│  usePermissions  │
│  Hook            │
└────┬─────────────┘
     │
     │ 1. Get user's role from AuthContext
     │ 2. Look up role in rolePermissions map
     │ 3. Check if permission exists
     ▼
┌──────────────────┐
│  Return          │
│  true/false      │
└────┬─────────────┘
     │
     ├─── true ──▶ Allow action
     │
     └─── false ─▶ Hide button / Show error
```

## 📝 Audit Log Flow

```
┌──────────────────┐
│  User performs   │
│  action          │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Action handler  │
│  (e.g., create   │
│   product)       │
└────┬─────────────┘
     │
     │ 1. Perform action
     ▼
┌──────────────────┐
│  Database        │
│  operation       │
└────┬─────────────┘
     │
     │ 2. Call auditLog.log()
     ▼
┌──────────────────┐
│  Audit Log       │
│  Service         │
└────┬─────────────┘
     │
     │ 3. Call Supabase RPC function
     ▼
┌──────────────────┐
│  create_audit_   │
│  log()           │
└────┬─────────────┘
     │
     │ 4. Insert into audit_logs table
     ▼
┌──────────────────┐
│  Audit record    │
│  created         │
└──────────────────┘
```

## 🎭 Role Hierarchy

```
                    ┌─────────────────┐
                    │   SUPERADMIN    │
                    │                 │
                    │  • All tenants  │
                    │  • All perms    │
                    └────────┬────────┘
                             │
                             │ inherits all
                             ▼
                    ┌─────────────────┐
                    │  TENANT_ADMIN   │
                    │                 │
                    │  • One tenant   │
                    │  • Manage users │
                    │  • Full access  │
                    └────────┬────────┘
                             │
                             │ inherits all
                             ▼
                    ┌─────────────────┐
                    │     STAFF       │
                    │                 │
                    │  • One tenant   │
                    │  • Basic ops    │
                    │  • Limited      │
                    └─────────────────┘
```

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────┐
│                    auth.users (Supabase)                 │
│  ┌────────────────────────────────────────────────┐    │
│  │ id (UUID, PK)                                   │    │
│  │ email                                           │    │
│  │ encrypted_password                              │    │
│  │ created_at                                      │    │
│  └────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ 1:1 relationship
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    public.users                          │
│  ┌────────────────────────────────────────────────┐    │
│  │ id (UUID, PK, FK → auth.users.id)              │    │
│  │ tenant_id (UUID, FK → tenants.id)              │    │
│  │ role (TEXT: superadmin|tenant_admin|staff)     │    │
│  │ branch_id (UUID, FK → branches.id)             │    │
│  │ created_at, updated_at                         │    │
│  └────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ Many:1 relationship
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    public.tenants                        │
│  ┌────────────────────────────────────────────────┐    │
│  │ id (UUID, PK)                                   │    │
│  │ name (TEXT)                                     │    │
│  │ subdomain (TEXT, UNIQUE)                        │    │
│  │ created_at, updated_at                         │    │
│  └────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ 1:Many relationship
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    public.branches                       │
│  ┌────────────────────────────────────────────────┐    │
│  │ id (UUID, PK)                                   │    │
│  │ tenant_id (UUID, FK → tenants.id)              │    │
│  │ name (TEXT)                                     │    │
│  │ location (TEXT)                                 │    │
│  │ created_at, updated_at                         │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   public.audit_logs                      │
│  ┌────────────────────────────────────────────────┐    │
│  │ id (UUID, PK)                                   │    │
│  │ tenant_id (UUID, FK → tenants.id)              │    │
│  │ user_id (UUID, FK → auth.users.id)             │    │
│  │ action (TEXT)                                   │    │
│  │ resource_type (TEXT)                            │    │
│  │ resource_id (TEXT)                              │    │
│  │ old_values (JSONB)                              │    │
│  │ new_values (JSONB)                              │    │
│  │ metadata (JSONB)                                │    │
│  │ created_at                                      │    │
│  └────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## 🛡️ Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Layer 1: Frontend                     │
│  • PermissionGate components                             │
│  • Role-based route protection                           │
│  • Conditional UI rendering                              │
│  ⚠️  NOT SECURE ALONE - Can be bypassed                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Layer 2: API Layer                    │
│  • JWT token validation                                  │
│  • Session verification                                  │
│  • Request authentication                                │
│  ✅  Secure - Enforced by Supabase                      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Layer 3: Database (RLS)               │
│  • Row Level Security policies                           │
│  • Tenant isolation                                      │
│  • Role-based data access                                │
│  ✅  Most Secure - Cannot be bypassed                   │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Component Interaction

```
┌──────────────┐
│   App.tsx    │
└──────┬───────┘
       │
       │ wraps with
       ▼
┌──────────────┐
│ AuthProvider │◀─── Manages global auth state
└──────┬───────┘
       │
       │ provides context to
       ▼
┌──────────────┐
│ProtectedRoute│◀─── Checks authentication
└──────┬───────┘
       │
       │ renders
       ▼
┌──────────────┐
│   Layout     │
└──────┬───────┘
       │
       │ renders
       ▼
┌──────────────┐
│  Dashboard   │
│  Inventory   │◀─── Use usePermissions()
│  POS         │◀─── Use PermissionGate
│  etc.        │◀─── Call auditLog.log()
└──────────────┘
```

## 📊 Data Flow

```
User Login
    │
    ▼
Supabase Auth ──▶ Create Session
    │
    ▼
Fetch Profile ──▶ Get tenant_id, role, branch_id
    │
    ▼
Store in Context ──▶ Available to all components
    │
    ▼
Component Renders ──▶ Check permissions
    │
    ▼
User Action ──▶ Verify permission ──▶ Execute ──▶ Log audit
```

---

**This architecture provides**:
- ✅ Secure authentication
- ✅ Multi-tenant isolation
- ✅ Role-based access control
- ✅ Complete audit trail
- ✅ Scalable design
