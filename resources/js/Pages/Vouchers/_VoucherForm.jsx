import React, { useMemo } from "react";
import { useForm } from "@inertiajs/react";

export default function VoucherForm({ initial, can, onSave, saving }) {
  const form = useForm({
    narration: initial.narration ?? "",
    lines: (initial.lines ?? []).map(l => ({
      account: l.account ?? "",
      code: l.code ?? "",
      side: l.side ?? "dr",
      amount: Number(l.amount ?? 0),
      lf: l.lf ?? "",
    })),
  });

  const addLine = () =>
    form.setData("lines", [...form.data.lines, { account:"", code:"", side:"dr", amount:0, lf:"" }]);

  const removeLine = (i) =>
    form.setData("lines", form.data.lines.filter((_, idx) => idx !== i));

  const updateLine = (i, key, val) => {
    const list = [...form.data.lines];
    list[i] = { ...list[i], [key]: key === "amount" ? Number(val) : val };
    form.setData("lines", list);
  };

  const totals = useMemo(() => {
    const dr = form.data.lines.filter(l => l.side === 'dr').reduce((s,l)=>s+(Number(l.amount)||0),0);
    const cr = form.data.lines.filter(l => l.side === 'cr').reduce((s,l)=>s+(Number(l.amount)||0),0);
    return { dr, cr, diff: Number((dr - cr).toFixed(2)) };
  }, [form.data.lines]);

  const submit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-body">
        {/* Header */}
        <div className="row g-3 mb-2">
          <div className="col-md-4">
            <label className="form-label">Transaction date</label>
            <input className="form-control" value={initial.transaction_date ?? ""} disabled />
          </div>
          <div className="col-md-4">
            <label className="form-label">Entered by</label>
            <input className="form-control" value={initial.entered_by ?? ""} disabled />
          </div>
          <div className="col-md-4">
            <label className="form-label">Date entered</label>
            <input className="form-control" value={initial.date_entered ?? ""} disabled />
          </div>
        </div>

        {/* Lines */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="m-0">Entries</h6>
          <button type="button" className="btn btn-sm btn-outline-primary" onClick={addLine} disabled={!can.update}>
            + Add line
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0">
            <thead>
              <tr>
                <th>Account</th><th>Code</th><th>Side</th><th>Amount</th><th>LF</th><th style={{width:60}}></th>
              </tr>
            </thead>
            <tbody>
              {form.data.lines.length === 0 && (
                <tr><td colSpan="6" className="text-muted">No lines yet. Click “Add line”.</td></tr>
              )}
              {form.data.lines.map((l, i) => (
                <tr key={i}>
                  <td><input className="form-control" value={l.account} onChange={e=>updateLine(i,'account',e.target.value)} disabled={!can.update} /></td>
                  <td><input className="form-control" value={l.code} onChange={e=>updateLine(i,'code',e.target.value)} disabled={!can.update} /></td>
                  <td>
                    <select className="form-select" value={l.side} onChange={e=>updateLine(i,'side',e.target.value)} disabled={!can.update}>
                      <option value="dr">Dr</option>
                      <option value="cr">Cr</option>
                    </select>
                  </td>
                  <td><input type="number" step="0.01" className="form-control" value={l.amount} onChange={e=>updateLine(i,'amount',e.target.value)} disabled={!can.update} /></td>
                  <td><input className="form-control" value={l.lf} onChange={e=>updateLine(i,'lf',e.target.value)} disabled={!can.update} /></td>
                  <td>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removeLine(i)} disabled={!can.update}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><th colSpan="3" className="text-end">Total Debit</th><th>{totals.dr.toFixed(2)}</th><th colSpan="2" /></tr>
              <tr><th colSpan="3" className="text-end">Total Credit</th><th>{totals.cr.toFixed(2)}</th><th colSpan="2" /></tr>
              <tr className={totals.diff === 0 ? "table-success" : "table-danger"}>
                <th colSpan="3" className="text-end">Difference (Dr − Cr)</th><th>{totals.diff.toFixed(2)}</th><th colSpan="2" /></tr>
            </tfoot>
          </table>
        </div>
        {form.errors.lines && <div className="text-danger small mt-2">{form.errors.lines}</div>}

        <div className="mt-3">
          <label className="form-label">Remarks / Narration</label>
          <textarea className="form-control" rows={3}
            value={form.data.narration}
            onChange={e=>form.setData('narration', e.target.value)}
            disabled={!can.update}
          />
          {form.errors.narration && <div className="text-danger small">{form.errors.narration}</div>}
        </div>
      </div>

      <div className="card-footer d-flex justify-content-between align-items-center">
        <div className="text-muted small">Must have at least 2 entries and totals must match.</div>
        <div className="btn-group">
          <a href={route('vouchers.show', initial.id)} className="btn btn-outline-secondary">View</a>
          <button className="btn btn-primary" disabled={!can.update || saving || form.processing}>Save</button>
        </div>
      </div>
    </form>
  );
}
