// resources/js/Pages/Accounts/Index.jsx
import React, { useState } from "react";
import { Head, useForm, router, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

export default function AccountsIndex({ filters, accounts, types }) {
  const { props } = usePage();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const form = useForm({
    code: "",
    name: "",
    type: types?.[0] || "asset",
    active: true,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset();
    form.setData({ code: "", name: "", type: types?.[0] || "asset", active: true });
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    form.reset();
    form.setData({ code: a.code, name: a.name, type: a.type, active: !!a.active });
    setShowForm(true);
  };

  const submit = (e) => {
    e.preventDefault();
    if (editing) {
      form.put(route("accounts.update", editing.id), { preserveScroll: true, onSuccess: () => setShowForm(false) });
    } else {
      form.post(route("accounts.store"), { preserveScroll: true, onSuccess: () => setShowForm(false) });
    }
  };

  const onDelete = (a) => {
    if (!confirm(`Delete "${a.name}"?`)) return;
    router.delete(route("accounts.destroy", a.id), { preserveScroll: true });
  };

  const [q, setQ] = useState(filters?.q ?? "");
  const [type, setType] = useState(filters?.type ?? "");

  const search = (e) => {
    e.preventDefault();
    const params = {};
    if (q) params.q = q;
    if (type) params.type = type;
    router.get(route("accounts.index"), params, { preserveScroll: true, replace: true });
  };

  return (
    <AuthenticatedLayout header={<h4 className="m-0">Particulars (Account Headers)</h4>}>
      <Head title="Accounts Headers" />

      {props?.flash?.success && <div className="alert alert-success">{props.flash.success}</div>}
      {props?.flash?.error && <div className="alert alert-danger">{props.flash.error}</div>}

      <div className="d-flex justify-content-between align-items-center mb-3">
        <form className="row g-2" onSubmit={search}>
          <div className="col-auto">
            <input
              className="form-control"
              placeholder="Search name/code…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="col-auto">
            <select className="form-select text-capitalize" value={type} onChange={(e)=>setType(e.target.value)}>
              <option value="">All types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="col-auto">
            <button className="btn btn-outline-secondary">Search</button>
          </div>
        </form>

        <button className="btn btn-primary" onClick={openCreate}>Add Account Headers</button>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th style={{width:120}}>Code</th>
                <th>Name</th>
                <th style={{width:140}}>Type</th>
                <th style={{width:100}}>Active</th>
                <th style={{width:180}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {accounts.data.length === 0 && (
                <tr><td colSpan="5" className="text-center py-4">No accounts found.</td></tr>
              )}
              {accounts.data.map(a => (
                <tr key={a.id}>
                  <td className="fw-semibold">{a.code}</td>
                  <td>{a.name}</td>
                  <td className="text-capitalize">{a.type}</td>
                  <td>{a.active ? 'Yes' : 'No'}</td>
                  <td>
                    <div className="btn-group btn-group-sm" role="group">
                      <a
                        href={route("accounts.report", a.id)}
                        className="btn btn-outline-primary"
                        title="View report"
                      >
                        <i className="bi bi-bar-chart" />
                      </a>

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        title="Edit"
                        onClick={() => openEdit(a)}
                      >
                        <i className="bi bi-pencil" />
                      </button>

                     {/*  <button
                        type="button"
                        className="btn btn-outline-danger"
                        title="Delete"
                        onClick={() => onDelete(a)}
                      >
                        <i className="bi bi-trash" />
                      </button> */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="card-body d-flex justify-content-between">
          <div>Showing {accounts.from || 0}-{accounts.to || 0} of {accounts.total}</div>
          <div className="btn-group">
            {accounts.links?.map((l, i) => (
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
                  <h5 className="modal-title">{editing ? `Edit ${editing.name}` : 'Add Account'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowForm(false)} />
                </div>

                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-4 mb-2">
                      <label className="form-label">Code</label>
                      <input
                        className="form-control"
                        value={form.data.code}
                        onChange={(e) => form.setData('code', e.target.value)}
                        autoFocus
                      />
                      {form.errors.code && <div className="text-danger small">{form.errors.code}</div>}
                    </div>

                    <div className="col-md-8 mb-2">
                      <label className="form-label">Name</label>
                      <input
                        className="form-control"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                      />
                      {form.errors.name && <div className="text-danger small">{form.errors.name}</div>}
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-2">
                      <label className="form-label">Type</label>
                      <select
                        className="form-select text-capitalize"
                        value={form.data.type}
                        onChange={(e) => form.setData('type', e.target.value)}
                      >
                        {types.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {form.errors.type && <div className="text-danger small">{form.errors.type}</div>}
                    </div>

                    <div className="col-md-6 mb-2">
                      <label className="form-label d-block">Active</label>
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={!!form.data.active}
                        onChange={(e) => form.setData('active', e.target.checked)}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
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
    </AuthenticatedLayout>
  );
}
