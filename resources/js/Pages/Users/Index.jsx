import React, { useState } from "react";
import { Head, useForm, router, Link } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout"; // 👈 add this

function Index({ filters, users, roles }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const form = useForm({
    name: "",
    email: "",
    role: roles?.[0] || "User",
    is_active: true,
    password: "",
    password_confirmation: "",
  });

  const openCreate = () => {
    setEditing(null);
    form.reset();
    form.setData({
      name: "",
      email: "",
      role: roles?.[0] || "User",
      is_active: true,
      password: "",
      password_confirmation: "",
    });
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    form.reset();
    form.setData({
      name: u.name || "",
      email: u.email || "",
      role: u.role || (roles?.[0] || "User"),
      is_active: !!u.is_active,
      password: "",
      password_confirmation: "",
    });
    setShowForm(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (editing) {
      form.put(route("users.update", editing.id), {
        preserveScroll: true,
        onSuccess: () => setShowForm(false),
      });
    } else {
      form.post(route("users.store"), {
        preserveScroll: true,
        onSuccess: () => setShowForm(false),
      });
    }
  };

  const onDelete = (u) => {
    if (!confirm(`Delete ${u.name}?`)) return;
    router.delete(route("users.destroy", u.id), { preserveScroll: true });
  };

  const [q, setQ] = useState(filters?.q ?? "");
  const search = (e) => {
    e.preventDefault();
    router.get(route("users.index"), { q }, { preserveScroll: true, replace: true });
  };

  return (
    <div className="container py-4">
      <Head title="Users" />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="m-0">Users</h4>
        <button className="btn btn-primary" onClick={openCreate}>Add User</button>
      </div>

      {/* Search */}
      <form className="row g-2 mb-3" onSubmit={search}>
        <div className="col-auto">
          <input
            className="form-control"
            placeholder="Search name/email/role"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-outline-secondary">Search</button>
        </div>
      </form>

      {/* Table */}
      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th style={{width:160}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.data.length === 0 && (
                <tr><td colSpan="5" className="text-center py-4">No users</td></tr>
              )}
              {users.data.map(u => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-sm btn-outline-primary" onClick={()=>openEdit(u)}>Edit</button>
                      <button className="btn btn-sm btn-outline-danger" onClick={()=>onDelete(u)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="card-body d-flex justify-content-between">
          <div>Showing {users.from || 0}-{users.to || 0} of {users.total}</div>
          <div className="btn-group">
            {users.links?.map((l, i) => (
              <button
                key={i}
                className={`btn btn-sm ${l.active ? 'btn-primary' : 'btn-outline-primary'}`}
                disabled={!l.url}
                onClick={() => l.url && router.visit(l.url, { preserveScroll: true })}
                dangerouslySetInnerHTML={{ __html: l.label }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showForm && (
        <>
          <div className="modal d-block" style={{ zIndex: 1055 }}>
            <div className="modal-dialog">
              <form className="modal-content" onSubmit={submit}>
                <div className="modal-header">
                  <h5 className="modal-title">{editing ? `Edit ${editing.name}` : 'Add User'}</h5>
                  <button type="button" className="btn-close" onClick={()=>setShowForm(false)} />
                </div>

                <div className="modal-body">
                  <div className="mb-2">
                    <label className="form-label">Name</label>
                    <input
                      className="form-control"
                      value={form.data.name}
                      onChange={(e)=>form.setData('name', e.target.value)}
                      autoFocus
                    />
                    {form.errors.name && <div className="text-danger small">{form.errors.name}</div>}
                  </div>

                  <div className="mb-2">
                    <label className="form-label">Email</label>
                    <input
                      className="form-control"
                      type="email"
                      value={form.data.email}
                      onChange={(e)=>form.setData('email', e.target.value)}
                    />
                    {form.errors.email && <div className="text-danger small">{form.errors.email}</div>}
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="form-label">Role</label>
                      <select
                        className="form-select"
                        value={form.data.role}
                        onChange={(e)=>form.setData('role', e.target.value)}
                      >
                        {roles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {form.errors.role && <div className="text-danger small">{form.errors.role}</div>}
                    </div>

                    <div className="col-md-6 mb-2">
                      <label className="form-label d-block">Active</label>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={!!form.data.is_active}
                        onChange={(e)=>form.setData('is_active', e.target.checked)}
                      />
                    </div>
                  </div>

                  <hr className="my-2" />
                  <div className="mb-2">
                    <label className="form-label">{editing ? 'New Password (optional)' : 'Password'}</label>
                    <input
                      className="form-control"
                      type="password"
                      value={form.data.password}
                      onChange={(e)=>form.setData('password', e.target.value)}
                    />
                    {form.errors.password && <div className="text-danger small">{form.errors.password}</div>}
                  </div>

                  <div className="mb-2">
                    <label className="form-label">Confirm Password</label>
                    <input
                      className="form-control"
                      type="password"
                      value={form.data.password_confirmation}
                      onChange={(e)=>form.setData('password_confirmation', e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={()=>setShowForm(false)}>Cancel</button>
                  <button className="btn btn-primary" disabled={form.processing}>
                    {editing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          <div className="modal-backdrop show" style={{ zIndex: 1050, pointerEvents: 'none' }} />
        </>
      )}
    </div>
  );
}

// 👇 Attach the AuthenticatedLayout (header is optional)
Index.layout = (page) => (
  <AuthenticatedLayout header={<h5 className="m-0">User Management</h5>}>
    {page}
  </AuthenticatedLayout>
);

export default Index;
