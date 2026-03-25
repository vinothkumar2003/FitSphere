import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../utils/AuthProvider';
import './GymPlansPage.css';

const emptyForm = {
  name: '',
  type: '',
  manufacturer: '',
  quantity: 1,
  reorderLevel: 0,
  unitCost: '',
  location: '',
  notes: '',
};

const cardStyle = {
  background: '#ffffff',
  borderRadius: 20,
  padding: 24,
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
};

const fieldStyle = {
  width: '100%',
  padding: '12px 14px',
  border: '1px solid #d6d9e0',
  borderRadius: 12,
  fontSize: 14,
  outline: 'none',
};

const buttonStyle = {
  border: 'none',
  borderRadius: 12,
  padding: '10px 16px',
  fontWeight: 600,
  cursor: 'pointer',
};

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

const getErrorMessage = (err, fallbackMessage) => {
  const responseData = err?.response?.data;

  if (typeof responseData === 'string' && responseData.trim()) return responseData;
  if (responseData?.message) return responseData.message;
  if (responseData?.error) return responseData.error;
  if (err?.message) return err.message;
  return fallbackMessage;
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (Number.isNaN(amount)) return 'N/A';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
};

const GymEquipmentPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isAdmin = user?.role === 'ADMIN';

  const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const navLinks = [
    { label: 'Dashboard', to: '/admin' },
    { label: 'Finance', to: '/admin/finance' },
    { label: 'Equipment', to: '/admin/gym-equipment' },
    { label: 'Users', to: '/admin/users' },
  ];

  const loadEquipment = async () => {
    setIsLoading(true);
    setError('');

    try {
      const res = await api.get('/api/gym-equipment');
      setEquipment(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load gym equipment.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEquipment();
  }, []);

  const stats = useMemo(() => {
    const totalItems = equipment.length;
    const totalUnits = equipment.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    const lowStockItems = equipment.filter((item) => Number(item.reorderLevel) > 0 && Number(item.quantity) <= Number(item.reorderLevel)).length;
    const inventoryValue = equipment.reduce(
      (sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitCost) || 0)),
      0
    );

    return { totalItems, totalUnits, lowStockItems, inventoryValue };
  }, [equipment]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleEdit = (item) => {
    setForm({
      name: item.name || '',
      type: item.type || '',
      manufacturer: item.manufacturer || '',
      quantity: item.quantity ?? 1,
      reorderLevel: item.reorderLevel ?? 0,
      unitCost: item.unitCost ?? '',
      location: item.location || '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setSuccess('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      name: form.name.trim(),
      type: form.type.trim(),
      manufacturer: form.manufacturer.trim(),
      quantity: Number(form.quantity),
      reorderLevel: Number(form.reorderLevel || 0),
      unitCost: form.unitCost === '' ? null : Number(form.unitCost),
      location: form.location.trim(),
      notes: form.notes.trim(),
    };

    try {
      if (editingId) {
        await api.put(`/api/gym-equipment/${editingId}`, payload, getAuthConfig());
        setSuccess('Equipment updated successfully.');
      } else {
        await api.post('/api/gym-equipment', payload, getAuthConfig());
        setSuccess('Equipment added successfully.');
      }

      resetForm();
      await loadEquipment();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save equipment.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm('Deactivate this equipment item?')) return;

    setError('');
    setSuccess('');

    try {
      await api.delete(`/api/gym-equipment/${id}`, getAuthConfig());
      setSuccess('Equipment deactivated successfully.');
      if (editingId === id) resetForm();
      await loadEquipment();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to deactivate equipment.'));
    }
  };

  return (
    <main className="gym-plans-page">
      <div style={{ maxWidth: 1280, margin: '0 auto', display: 'grid', gap: 24 }}>
        {isAdmin ? (
          <nav className="plans-top-nav" aria-label="Admin equipment navigation">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} className={`plans-top-nav-link ${location.pathname === link.to ? 'active' : ''}`}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <section style={{ ...cardStyle, background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #0f766e 100%)', color: '#fff' }}>
          <p style={{ margin: 0, opacity: 0.8, letterSpacing: 1.2, textTransform: 'uppercase', fontSize: 12 }}>
            FitSphere Inventory
          </p>
          <h1 style={{ margin: '12px 0 8px', fontSize: 34 }}>Gym Equipment</h1>
          <p style={{ margin: 0, maxWidth: 720, lineHeight: 1.6, opacity: 0.92 }}>
            View the active equipment list and, for admins, manage reorder levels, inventory value, storage location, and internal notes.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 18 }}>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 12, opacity: 0.82 }}>Active items</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.totalItems}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 12, opacity: 0.82 }}>Units on hand</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.totalUnits}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 12, opacity: 0.82 }}>Low stock</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{stats.lowStockItems}</div>
            </div>
            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(255,255,255,0.12)' }}>
              <div style={{ fontSize: 12, opacity: 0.82 }}>Inventory value</div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{formatCurrency(stats.inventoryValue)}</div>
            </div>
          </div>
        </section>

        {error ? <div style={{ ...cardStyle, border: '1px solid #fecaca', color: '#b91c1c', background: '#fef2f2' }}>{error}</div> : null}
        {success ? <div style={{ ...cardStyle, border: '1px solid #bbf7d0', color: '#166534', background: '#f0fdf4' }}>{success}</div> : null}

        {isAdmin ? (
          <section style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>{editingId ? 'Edit Equipment' : 'Add Equipment'}</h2>
                <p style={{ margin: '6px 0 0', color: '#64748b' }}>Manage inventory details for stock planning.</p>
              </div>
              {editingId ? (
                <button type="button" onClick={resetForm} style={{ ...buttonStyle, background: '#e2e8f0', color: '#0f172a' }}>
                  Cancel Edit
                </button>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                <input name="name" value={form.name} onChange={handleChange} placeholder="Equipment name" required style={fieldStyle} />
                <input name="type" value={form.type} onChange={handleChange} placeholder="Type" required style={fieldStyle} />
                <input name="manufacturer" value={form.manufacturer} onChange={handleChange} placeholder="Manufacturer" required style={fieldStyle} />
                <input name="location" value={form.location} onChange={handleChange} placeholder="Location" style={fieldStyle} />
                <input name="quantity" type="number" min="0" value={form.quantity} onChange={handleChange} placeholder="Quantity" required style={fieldStyle} />
                <input name="reorderLevel" type="number" min="0" value={form.reorderLevel} onChange={handleChange} placeholder="Reorder level" style={fieldStyle} />
                <input name="unitCost" type="number" min="0" step="0.01" value={form.unitCost} onChange={handleChange} placeholder="Unit cost" style={fieldStyle} />
              </div>
              <textarea name="notes" value={form.notes} onChange={handleChange} placeholder="Internal notes" style={{ ...fieldStyle, minHeight: 100, resize: 'vertical' }} />
              <div>
                <button type="submit" disabled={isSaving} style={{ ...buttonStyle, background: '#2563eb', color: '#fff' }}>
                  {isSaving ? 'Saving...' : editingId ? 'Update Equipment' : 'Add Equipment'}
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 24 }}>Available Equipment</h2>
              <p style={{ margin: '6px 0 0', color: '#64748b' }}>Active inventory items currently available in the gym.</p>
            </div>
            <button type="button" onClick={loadEquipment} style={{ ...buttonStyle, background: '#e2e8f0', color: '#0f172a' }}>
              Refresh
            </button>
          </div>

          {isLoading ? (
            <p style={{ margin: 0, color: '#475569' }}>Loading equipment...</p>
          ) : equipment.length === 0 ? (
            <p style={{ margin: 0, color: '#475569' }}>No equipment found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '12px 10px' }}>Name</th>
                    <th style={{ padding: '12px 10px' }}>Type</th>
                    <th style={{ padding: '12px 10px' }}>Manufacturer</th>
                    <th style={{ padding: '12px 10px' }}>Location</th>
                    <th style={{ padding: '12px 10px' }}>Quantity</th>
                    <th style={{ padding: '12px 10px' }}>Reorder</th>
                    <th style={{ padding: '12px 10px' }}>Unit Cost</th>
                    <th style={{ padding: '12px 10px' }}>Status</th>
                    {isAdmin ? <th style={{ padding: '12px 10px' }}>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item) => {
                    const isLowStock = Number(item.reorderLevel) > 0 && Number(item.quantity) <= Number(item.reorderLevel);

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #eef2f7', verticalAlign: 'top' }}>
                        <td style={{ padding: '14px 10px', fontWeight: 600 }}>
                          {item.name}
                          {item.notes ? <div style={{ marginTop: 6, fontWeight: 400, color: '#64748b' }}>{item.notes}</div> : null}
                        </td>
                        <td style={{ padding: '14px 10px' }}>{item.type}</td>
                        <td style={{ padding: '14px 10px' }}>{item.manufacturer}</td>
                        <td style={{ padding: '14px 10px' }}>{item.location || 'N/A'}</td>
                        <td style={{ padding: '14px 10px' }}>{item.quantity}</td>
                        <td style={{ padding: '14px 10px' }}>{item.reorderLevel ?? 0}</td>
                        <td style={{ padding: '14px 10px' }}>{formatCurrency(item.unitCost)}</td>
                        <td style={{ padding: '14px 10px' }}>
                          <span style={{ padding: '6px 10px', borderRadius: 999, background: isLowStock ? '#fee2e2' : '#dcfce7', color: isLowStock ? '#b91c1c' : '#166534', fontWeight: 700 }}>
                            {isLowStock ? 'Low stock' : 'Healthy'}
                          </span>
                        </td>
                        {isAdmin ? (
                          <td style={{ padding: '14px 10px' }}>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                              <button type="button" onClick={() => handleEdit(item)} style={{ ...buttonStyle, background: '#dbeafe', color: '#1d4ed8' }}>
                                Edit
                              </button>
                              <button type="button" onClick={() => handleDelete(item.id)} style={{ ...buttonStyle, background: '#fee2e2', color: '#b91c1c' }}>
                                Deactivate
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default GymEquipmentPage;
