// pages/UserManagementPage.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { PERMISSIONS, PERMISSION_GROUPS } from '../constants/permissions';

export default function UserManagementPage() {
  const { user, users, createUser, updateUser, deleteUser, isAdmin } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'user',
    permissions: [],
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debug: Log users to see their structure
  useEffect(() => {
    if (users && users.length > 0) {
      console.log('Users data:', users);
      console.log('First user structure:', users[0]);
      console.log('User ID field:', users[0]._id, users[0].id);
    }
  }, [users]);

  if (!isAdmin) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#c0392b', fontFamily: 'Tahoma, sans-serif' }}>
        <h2>Access Denied</h2>
        <p>Only administrators can manage users.</p>
      </div>
    );
  }

  const handleOpenModal = (userToEdit = null) => {
    if (userToEdit) {
      console.log('Editing user:', userToEdit);
      console.log('User ID:', userToEdit._id, userToEdit.id);
      
      setEditingUser(userToEdit);
      setFormData({
        username: userToEdit.username,
        password: '',
        name: userToEdit.name || '',
        role: userToEdit.role,
        permissions: userToEdit.permissions || [],
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        password: '',
        name: '',
        role: 'user',
        permissions: [],
      });
    }
    setError('');
    setShowModal(true);
  };

  const handleTogglePermission = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const handleSelectAllGroup = (groupPermissions, select) => {
    setFormData(prev => ({
      ...prev,
      permissions: select
        ? [...new Set([...prev.permissions, ...groupPermissions])]
        : prev.permissions.filter(p => !groupPermissions.includes(p)),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!editingUser && !formData.password) {
      setError('Password is required for new users');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    if (editingUser) {
      // CRITICAL FIX: Use _id (MongoDB) or fallback to id
      const userId = editingUser._id || editingUser.id;
      
      console.log('Updating user with ID:', userId);
      console.log('Editing user object:', editingUser);
      
      if (!userId) {
        setError('Invalid user ID. Please refresh the page and try again.');
        setIsSubmitting(false);
        return;
      }
      
      const updates = {
        name: formData.name,
        role: formData.role,
        permissions: formData.permissions,
      };
      if (formData.password) {
        updates.password = formData.password;
      }
      
      const result = await updateUser(userId, updates);
      if (result.success) {
        setShowModal(false);
        setEditingUser(null);
      } else {
        setError(result.error);
      }
    } else {
      const result = await createUser(formData);
      if (result.success) {
        setShowModal(false);
      } else {
        setError(result.error);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user "${userName}"?`)) {
      const result = deleteUser(userId);
      if (!result.success) {
        alert(result.error);
      }
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'Tahoma, sans-serif' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottom: '1px solid #aca899',
      }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>User Management</h1>
        <button
          onClick={() => handleOpenModal()}
          style={{
            padding: '6px 16px',
            background: 'linear-gradient(180deg,#c5d9f1 0%,#ddeeff 100%)',
            border: '1px solid #7aabda',
            cursor: 'pointer',
            fontSize: 12,
            fontFamily: 'inherit',
            borderRadius: 3,
          }}
        >
          + Add User
        </button>
      </div>
      
      {users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
          No users found. Click "Add User" to create one.
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#e8e4d8', borderBottom: '2px solid #aca899' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Username</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Name</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '8px 12px', textAlign: 'left' }}>Created</th>
              <th style={{ padding: '8px 12px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u._id || u.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '8px 12px' }}>{u.username}</td>
                <td style={{ padding: '8px 12px' }}>{u.name || '-'}</td>
                <td style={{ padding: '8px 12px' }}>
                  <span style={{
                    background: u.role === 'admin' ? '#0a246a' : '#555',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: 3,
                    fontSize: 10,
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                </td>
                <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                  <button
                    onClick={() => handleOpenModal(u)}
                    style={{
                      marginRight: 8,
                      padding: '3px 10px',
                      fontSize: 11,
                      cursor: 'pointer',
                      borderRadius: 2,
                      border: '1px solid #aca899',
                      background: '#fff',
                    }}
                  >
                    Edit
                  </button>
                  {(u._id !== user?._id && u.id !== user?.id) && (
                    <button
                      onClick={() => handleDelete(u._id || u.id, u.username)}
                      style={{
                        padding: '3px 10px',
                        fontSize: 11,
                        cursor: 'pointer',
                        background: '#c0392b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 2,
                      }}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            width: 600,
            maxHeight: '80vh',
            background: '#f0ede4',
            border: '1px solid #aca899',
            overflow: 'auto',
            borderRadius: 4,
          }}>
            <div style={{
              background: 'linear-gradient(180deg,#0a246a 0%,#1e3a8a 100%)',
              padding: '8px 12px',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{editingUser ? 'Edit User' : 'Add User'}</span>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ padding: 16 }}>
              {error && (
                <div style={{
                  background: '#f8d7da',
                  color: '#721c24',
                  padding: '6px 10px',
                  fontSize: 12,
                  marginBottom: 16,
                  border: '1px solid #f5c6cb',
                  borderRadius: 2,
                }}>
                  {error}
                </div>
              )}
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                  Username *
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 2, border: '1px solid #aca899' }}
                  disabled={!!editingUser}
                />
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                  {editingUser ? 'Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 2, border: '1px solid #aca899' }}
                />
              </div>
              
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 2, border: '1px solid #aca899' }}
                />
              </div>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                  style={{ width: '100%', padding: '6px 8px', fontSize: 13, borderRadius: 2, border: '1px solid #aca899' }}
                >
                  <option value="user">User</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              
              {formData.role !== 'admin' && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, marginBottom: 8 }}>
                    Permissions
                  </label>
                  {PERMISSION_GROUPS.map(group => {
                    const allSelected = group.permissions.every(p => formData.permissions.includes(p));
                    const someSelected = group.permissions.some(p => formData.permissions.includes(p));
                    
                    return (
                      <div key={group.name} style={{
                        marginBottom: 12,
                        border: '1px solid #ddd',
                        background: '#fff',
                        borderRadius: 2,
                      }}>
                        <div style={{
                          padding: '6px 10px',
                          background: '#e8e4d8',
                          borderBottom: '1px solid #ddd',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={el => {
                              if (el) el.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={(e) => handleSelectAllGroup(group.permissions, e.target.checked)}
                          />
                          <span style={{ fontWeight: 500, fontSize: 12 }}>{group.name}</span>
                        </div>
                        <div style={{ padding: '8px 10px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {group.permissions.map(perm => {
                            const label = perm.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                            return (
                              <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                                <input
                                  type="checkbox"
                                  checked={formData.permissions.includes(perm)}
                                  onChange={() => handleTogglePermission(perm)}
                                />
                                {label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{ padding: '6px 16px', cursor: 'pointer', borderRadius: 2, border: '1px solid #aca899', background: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  style={{
                    padding: '6px 16px',
                    background: isSubmitting ? '#ccc' : 'linear-gradient(180deg,#c5d9f1 0%,#ddeeff 100%)',
                    border: '1px solid #7aabda',
                    cursor: isSubmitting ? 'default' : 'pointer',
                    borderRadius: 2,
                  }}
                >
                  {isSubmitting ? 'Saving...' : (editingUser ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}