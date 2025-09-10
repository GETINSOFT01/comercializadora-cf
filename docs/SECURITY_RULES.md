# Firebase Security Rules Documentation

## Overview
This document outlines the comprehensive security rules implemented for the Comercializadora CF application, covering both Firestore database and Cloud Storage access control.

## Role-Based Access Control (RBAC)

### User Roles
- **admin**: Full system access, user management
- **manager**: Service and client management, reports access
- **supervisor**: Field operations, assigned service management
- **technician**: Field work, RAD reporting
- **finance**: Billing, invoicing, financial reports
- **client**: Limited access to own services and documents

## Firestore Security Rules

### Helper Functions
```javascript
function isAuthenticated() { return request.auth != null; }
function hasRole(role) { return request.auth != null && request.auth.token.role == role; }
function hasAnyRole(roles) { return request.auth != null && roles.hasAny([request.auth.token.role]); }
function isAdmin() { return hasRole('admin'); }
function isManager() { return hasAnyRole(['admin', 'manager']); }
function isSupervisor() { return hasAnyRole(['admin', 'manager', 'supervisor']); }
function isStaff() { return hasAnyRole(['admin', 'manager', 'supervisor', 'technician']); }
function isFinance() { return hasAnyRole(['admin', 'finance']); }
```

### Collection Access Matrix

| Collection | Admin | Manager | Supervisor | Technician | Finance | Client |
|------------|-------|---------|------------|------------|---------|--------|
| **clients** | CRUD | CRUD | R | R | R | R (own) |
| **services** | CRUD | CRUD | RU (assigned) | RU (assigned) | RU (billing) | R (own) |
| **proposals** | CRUD | CRUD | R (assigned) | - | R | - |
| **daily_reports** | CRUD | CRUD | CRU (own) | CRU (own) | R | R (own services) |
| **invoices** | R | R | - | - | CRUD | R (own) |
| **users** | CRUD | R | - | - | - | R (own) |
| **audit_logs** | R | R | - | - | - | - |
| **system_config** | CRUD | - | - | - | - | - |
| **notifications** | - | - | - | - | - | RU (own) |

*Legend: C=Create, R=Read, U=Update, D=Delete*

### Specific Rules

#### Services Collection
- **Assignment-based access**: Supervisors and technicians can only access services where they are in the `assignedTeam` array
- **Field restrictions**: Non-managers can only update specific fields based on their role
- **Status transitions**: Finance can only update status for completed services

#### Daily Reports (RADs)
- **Ownership**: Users can only create/update RADs they authored (`reportedBy` field)
- **Service validation**: RADs must be linked to valid, accessible services
- **Client access**: Clients can read RADs for their own services

#### Data Validation
- **Field restrictions**: Users can only modify allowed fields based on their role
- **Status validation**: Certain status changes require specific roles
- **Assignment validation**: Team assignments are validated for access control

## Cloud Storage Security Rules

### File Organization
```
/public/                    # Public assets (admin write only)
/users/{userId}/profile/    # User profile images
/services/{serviceId}/
  ├── evidence/            # RAD evidence photos
  ├── tech_visit/          # Technical visit photos
  ├── proposals/           # Proposal PDFs
  ├── invoices/            # Invoice documents
  └── documents/           # General service documents
/clients/{clientId}/
  ├── contracts/           # Client contracts
  ├── documents/           # Client documents
  └── fiscal_data/         # Tax information
/system/                   # System backups (admin only)
/temp/{userId}/            # Temporary uploads
```

### File Type and Size Restrictions
- **Images**: 10MB limit for evidence/photos, 5MB for profiles
- **PDFs**: 50MB limit for documents/proposals/invoices
- **Temporary files**: 100MB limit, auto-cleanup via Cloud Functions

### Access Control
- **Role-based folders**: Different roles can access different folder types
- **Content-type validation**: Strict MIME type checking
- **Size limits**: Prevents abuse and storage bloat
- **User isolation**: Users can only access their own temp folders

## Security Testing

### Test Scenarios

#### Authentication Tests
- [ ] Unauthenticated users cannot access any protected resources
- [ ] Invalid tokens are rejected
- [ ] Expired tokens trigger re-authentication

#### Role-based Access Tests
- [ ] Admin can access all collections and perform all operations
- [ ] Manager cannot access admin-only functions
- [ ] Supervisor can only access assigned services
- [ ] Technician cannot access financial data
- [ ] Finance cannot modify service assignments
- [ ] Client can only access own data

#### Data Validation Tests
- [ ] Field-level restrictions are enforced
- [ ] Status transitions follow business rules
- [ ] Assignment validation works correctly
- [ ] File upload restrictions are enforced

#### Edge Cases
- [ ] Users with no role assigned are handled correctly
- [ ] Malformed requests are rejected
- [ ] Concurrent access scenarios work properly
- [ ] Large file uploads are handled correctly

## Deployment Commands

### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Storage Rules
```bash
firebase deploy --only storage
```

### Deploy All Rules
```bash
firebase deploy --only firestore:rules,storage
```

### Test Rules Locally
```bash
firebase emulators:start --only firestore,storage
```

## Monitoring and Auditing

### Security Monitoring
- Monitor failed authentication attempts
- Track unauthorized access attempts
- Log privilege escalation attempts
- Monitor unusual file access patterns

### Audit Logging
- All administrative actions are logged
- User role changes are tracked
- Critical data modifications are recorded
- File access is monitored for sensitive documents

## Best Practices

### Development
1. Always test rules in emulator before deployment
2. Use principle of least privilege
3. Validate all user inputs
4. Implement proper error handling
5. Regular security reviews

### Production
1. Monitor rule performance and usage
2. Regular security audits
3. Keep rules updated with application changes
4. Backup rule configurations
5. Document all changes

## Troubleshooting

### Common Issues
1. **Permission Denied**: Check user role and authentication status
2. **Field Access**: Verify field-level permissions for the user's role
3. **File Upload Fails**: Check file size, type, and folder permissions
4. **Assignment Access**: Ensure user is in service's assignedTeam array

### Debug Commands
```bash
# Check rule coverage
firebase firestore:rules:test

# Validate rules syntax
firebase firestore:rules:validate

# Monitor real-time rule execution
firebase firestore:rules:debug
```

## Security Checklist

- [ ] All collections have proper access controls
- [ ] File uploads are restricted by type and size
- [ ] User roles are properly validated
- [ ] Assignment-based access works correctly
- [ ] Client data isolation is enforced
- [ ] Admin functions are properly protected
- [ ] Audit logging is implemented
- [ ] Rules are tested and validated
- [ ] Documentation is up to date
- [ ] Monitoring is in place

---

**Last Updated**: 2025-01-09
**Version**: 1.0
**Reviewed By**: Development Team
