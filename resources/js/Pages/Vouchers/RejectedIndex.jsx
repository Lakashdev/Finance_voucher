import React, { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";

function RejectedIndex({ filters, vouchers }) {
  const [q, setQ] = useState(filters?.q ?? "");

  const search = (e) => {
    e.preventDefault();
    router.get(route("vouchers.rejected"), { q }, { preserveScroll: true, replace: true });
  };

  return (
    <div className="container py-3">
      <Head title="My Rejected Vouchers" />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="m-0">My Rejected Vouchers</h4>
      </div>

      <form className="row g-2 mb-3" onSubmit={search}>
        <div className="col-auto">
          <input
            className="form-control"
            placeholder="Search JV # or reason"
            value={q}
            onChange={(e)=>setQ(e.target.value)}
          />
        </div>
        <div className="col-auto">
          <button className="btn btn-outline-secondary">Search</button>
        </div>
      </form>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th style={{width:140}}>JV Number</th>
                <th>Rejection Reason</th>
                <th style={{width:160}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.data.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center py-4">No rejected vouchers.</td>
                </tr>
              )}
              {vouchers.data.map(v => (
                <tr key={v.id}>
                  <td className="fw-semibold">{v.jv_number}</td>
                  <td>
                    {v.reject_reason
                      ? <span>{v.reject_reason}</span>
                      : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    <div className="btn-group">
                      <Link
                        href={route('vouchers.show', v.id)}
                        className="btn btn-sm btn-outline-secondary"
                      >
                        View
                      </Link>
                      <Link
                        href={route('vouchers.edit', v.id)}
                        className={`btn btn-sm ${v.can.update ? 'btn-outline-primary' : 'btn-outline-primary disabled'}`}
                        aria-disabled={!v.can.update}
                        >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="card-body d-flex justify-content-between">
          <div>
            Showing {vouchers.from || 0}-{vouchers.to || 0} of {vouchers.total}
          </div>
          <div className="btn-group">
            {vouchers.links?.map((l, i) => (
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
    </div>
  );
}

RejectedIndex.layout = (page) => (
  <AuthenticatedLayout>
    {page}
  </AuthenticatedLayout>
);

export default RejectedIndex;
