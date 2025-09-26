// resources/js/Pages/Vouchers/Edit.jsx
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, usePage, Link } from '@inertiajs/react';
import Select from 'react-select';
import { useMemo } from 'react';

export default function Edit({ voucher, accounts = [], can }) {
  const { props } = usePage();
  const locked = !can?.update; // only rejected vouchers should be editable

  // Quick lookup for "Code" column
  const accountMap = useMemo(() => {
    const m = {};
    for (const a of accounts) m[String(a.id)] = a;
    return m;
  }, [accounts]);

  // Select options
  const accountOptions = useMemo(
    () => accounts.map(a => ({ value: String(a.id), label: `${a.name} (${a.code})` })),
    [accounts]
  );

  // ---- Build initial lines with allocations restored ----
  const initialLines = useMemo(() => {
    // 1) Base lines -> UI shape
    const base = (voucher.lines ?? []).map((l) => {
      const side = l.side ?? (Number(l.debit) > 0 ? 'dr' : 'cr');
      const amount =
        l.amount !== undefined
          ? l.amount
          : (side === 'dr'
              ? Number(l.debit || 0).toFixed(2)
              : Number(l.credit || 0).toFixed(2));

      return {
        account_id: l.account_id ? String(l.account_id) : '',
        side,
        amount,
        lf: l.lf ?? '',
        // If backend already provided alloc_to (index within debits list), keep it
        alloc_to:
          l.alloc_to !== undefined && l.alloc_to !== null && l.alloc_to !== ''
            ? String(l.alloc_to)
            : '',
      };
    });

    // 2) If alloc_to is not present but we got voucher.allocations (global indices),
    //    map them to alloc_to (index within the debits array).
    const needRestore =
      (voucher.allocations?.length ?? 0) > 0 &&
      base.some(b => b.side === 'cr' && (b.alloc_to === '' || b.alloc_to === null));

    if (needRestore) {
      // Build map: global line index -> position within "debits" array
      const debitPosByGlobalIndex = {};
      let pos = 0;
      base.forEach((line, idx) => {
        if (line.side === 'dr') {
          debitPosByGlobalIndex[idx] = pos++;
        }
      });

      for (const a of voucher.allocations) {
        const di = a?.debit_index;
        const ci = a?.credit_index;
        if (
          Number.isInteger(di) &&
          Number.isInteger(ci) &&
          base[ci] &&
          base[ci].side === 'cr' &&
          debitPosByGlobalIndex.hasOwnProperty(di)
        ) {
          base[ci].alloc_to = String(debitPosByGlobalIndex[di]);
        }
      }
    }

    return base;
  }, [voucher]);

  // ---- Form state ----
  const form = useForm({
    transaction_date: voucher.transaction_date || '',
    narration: voucher.narration ?? '',
    lines: initialLines,
  });
  const { data, setData, processing, errors } = form;

  const addLine = () =>
    setData('lines', [...data.lines, { account_id: '', side: 'dr', amount: '', lf: '', alloc_to: '' }]);

  const removeLine = (idx) =>
    setData('lines', data.lines.filter((_, i) => i !== idx));

  const updateLine = (idx, patch) =>
    setData('lines', data.lines.map((l, i) => {
      if (i !== idx) return l;
      const next = { ...l, ...patch };
      // switching to Debit clears any alloc_to
      if (patch.side === 'dr') next.alloc_to = '';
      return next;
    }));

  // Totals
  const totals = useMemo(() => {
    let dr = 0, cr = 0;
    for (const l of data.lines) {
      const amt = parseFloat(l.amount || 0);
      if (!amt) continue;
      if (l.side === 'dr') dr += amt; else if (l.side === 'cr') cr += amt;
    }
    dr = Math.round(dr * 100) / 100;
    cr = Math.round(cr * 100) / 100;
    return { dr, cr, diff: (dr - cr).toFixed(2) };
  }, [data.lines]);

  // Debit accounts must be unique
  const hasDuplicateDebitAccounts = useMemo(() => {
    const ids = data.lines
      .filter(l => l.side === 'dr')
      .map(l => String(l.account_id || ''))
      .filter(Boolean);
    return new Set(ids).size !== ids.length;
  }, [data.lines]);

  // Build debit list + remaining (after allocations)
  const debitInfo = useMemo(() => {
    const debits = data.lines
      .map((l, i) => ({ ...l, index: i }))
      .filter(l => l.side === 'dr');

    const remaining = debits.map(d => parseFloat(d.amount || 0));

    data.lines.forEach((l) => {
      if (l.side !== 'cr') return;
      const amt = parseFloat(l.amount || 0);
      if (!amt) return;
      const di = l.alloc_to === '' ? null : Number(l.alloc_to);
      if (di != null && !Number.isNaN(di) && debits[di]) {
        remaining[di] = Math.max(0, (remaining[di] || 0) - amt);
      }
    });

    const debitOptions = debits.map((d, k) => {
      const acc = accountMap[String(d.account_id || '')];
      const labelName = acc ? `${acc.name} (${acc.code})` : `Line ${d.index + 1}`;
      return {
        value: String(k),
        label: `${k + 1}. ${labelName} — remaining ${Number(remaining[k] || 0).toFixed(2)}`,
      };
    });

    const globalToDebitIdx = {};
    debits.forEach((d, k) => { globalToDebitIdx[d.index] = k; });

    const allDebitsFullyAllocated = remaining.every(r => Math.abs(Number(r || 0)) < 0.005);

    return { debits, remaining, debitOptions, globalToDebitIdx, allDebitsFullyAllocated };
  }, [data.lines, accountMap]);

  // Every credit must have an allocation
  const allCreditsAllocated = useMemo(() => {
    return data.lines
      .filter(l => l.side === 'cr' && Number(l.amount || 0) > 0)
      .every(l => l.alloc_to !== '' && l.alloc_to !== null && l.alloc_to !== undefined);
  }, [data.lines]);

  // No over-allocation
  const hasOverAllocation = useMemo(() => {
    const debits = data.lines
      .map((l, i) => ({ ...l, index: i }))
      .filter(l => l.side === 'dr');

    const used = new Array(debits.length).fill(0);

    data.lines.forEach((l) => {
      if (l.side !== 'cr') return;
      const di = l.alloc_to === '' ? null : Number(l.alloc_to);
      const amt = parseFloat(l.amount || 0);
      if (di != null && !Number.isNaN(di) && debits[di]) {
        used[di] += amt;
      }
    });

    return used.some((u, k) => u > parseFloat(debits[k].amount || 0) + 1e-9);
  }, [data.lines]);

  // Build allocations payload (global indexes)
  const buildAllocations = () => {
    const debits = data.lines
      .map((l, i) => ({ ...l, index: i }))
      .filter(l => l.side === 'dr');

    const allocations = [];
    data.lines.forEach((l, ci) => {
      if (l.side !== 'cr') return;
      const di = Number(l.alloc_to);
      const amt = parseFloat(l.amount || 0);
      if (Number.isFinite(di) && debits[di] && amt > 0) {
        allocations.push({
          debit_index: debits[di].index,
          credit_index: ci,
          amount: amt,
        });
      }
    });
    return allocations;
  };

  const submit = (e) => {
    e.preventDefault();
    const allocations = buildAllocations();
    form.transform((payload) => ({ ...payload, allocations }));
    form.put(route('vouchers.update', voucher.id), { preserveScroll: true });
  };

  const getAccountById = (id) => accountMap[String(id || '')];

  return (
    <AuthenticatedLayout header={<h2 className="m-0">Edit Voucher — {voucher.jv_number}</h2>}>
      <Head title={`Edit ${voucher.jv_number}`} />

      {voucher.status === 'rejected' && (
        <div className="alert alert-warning">
          Rejected: {voucher.reject_reason || 'No reason specified.'} — You can edit and resubmit.
        </div>
      )}
      {props?.flash?.success && <div className="alert alert-success">{props.flash.success}</div>}
      {errors?.lines && <div className="alert alert-danger">{errors.lines}</div>}

      {hasDuplicateDebitAccounts && (
        <div className="alert alert-danger">
          Duplicate <strong>debit</strong> accounts are not allowed in one voucher.
        </div>
      )}
      {!allCreditsAllocated && (
        <div className="alert alert-danger">
          Please allocate each <strong>credit</strong> line to a <strong>debit</strong>.
        </div>
      )}
      {!debitInfo.allDebitsFullyAllocated && (
        <div className="alert alert-danger">
          All <strong>debit</strong> lines must be fully allocated.
        </div>
      )}
      {hasOverAllocation && (
        <div className="alert alert-danger">
          Allocation exceeds one or more debit amounts. Adjust allocations.
        </div>
      )}
      {errors.allocations && <div className="alert alert-danger">{errors.allocations}</div>}

      <form onSubmit={submit} className="card shadow-sm">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Transaction date</label>
              <input
                type="date"
                className="form-control"
                value={data.transaction_date || ''}
                disabled
                onChange={() => {}}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Entered by</label>
              <input className="form-control" value={voucher.entered_by || ''} disabled />
            </div>
            <div className="col-md-4">
              <label className="form-label">Date entered</label>
              <input className="form-control" value={voucher.date_entered || ''} disabled />
            </div>
          </div>

          <div className="mt-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h5 className="m-0">Entries</h5>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={addLine}
                disabled={locked}
              >
                + Add line
              </button>
            </div>

            <div className="table-responsive">
              <table className="table align-middle">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '32%' }}>Account</th>
                    <th style={{ width: '8%' }}>Code</th>
                    <th style={{ width: '12%' }}>Side</th>
                    <th style={{ width: '28%' }}>Allocates to (Debit)</th>
                    <th style={{ width: '14%' }}>Amount</th>
                    <th style={{ width: '6%' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.length === 0 && (
                    <tr>
                      <td colSpan="6" className="text-muted">No lines yet. Click “Add line”.</td>
                    </tr>
                  )}

                  {data.lines.map((line, idx) => {
                    const acc = getAccountById(line.account_id);

                    const selectedDebitOption =
                      line.side === 'cr' &&
                      line.alloc_to !== '' &&
                      debitInfo.debitOptions[Number(line.alloc_to)]
                        ? debitInfo.debitOptions[Number(line.alloc_to)]
                        : null;

                    const thisDebitRemain = (() => {
                      if (line.side !== 'dr') return null;
                      const k = debitInfo.globalToDebitIdx[idx];
                      if (k === undefined) return null;
                      return Number(debitInfo.remaining[k] || 0).toFixed(2);
                    })();

                    return (
                      <tr key={idx}>
                        <td>
                          <Select
                            options={accountOptions}
                            value={accountOptions.find(o => o.value === String(line.account_id || '')) || null}
                            onChange={(opt) => updateLine(idx, { account_id: opt?.value ?? '' })}
                            isClearable
                            isDisabled={locked}
                            placeholder="Search account…"
                          />
                          {errors[`lines.${idx}.account_id`] && (
                            <div className="text-danger small">{errors[`lines.${idx}.account_id`]}</div>
                          )}
                        </td>

                        <td className="text-muted">{acc?.code || '-'}</td>

                        <td>
                          <div className="btn-group" role="group">
                            <input
                              type="radio"
                              className="btn-check"
                              name={`side-${idx}`}
                              id={`dr-${idx}`}
                              checked={line.side === 'dr'}
                              onChange={() => updateLine(idx, { side: 'dr' })}
                              disabled={locked}
                            />
                            <label className="btn btn-outline-secondary" htmlFor={`dr-${idx}`}>Debit</label>

                            <input
                              type="radio"
                              className="btn-check"
                              name={`side-${idx}`}
                              id={`cr-${idx}`}
                              checked={line.side === 'cr'}
                              onChange={() => updateLine(idx, { side: 'cr' })}
                              disabled={locked}
                            />
                            <label className="btn btn-outline-secondary" htmlFor={`cr-${idx}`}>Credit</label>
                          </div>
                        </td>

                        <td>
                          {line.side === 'cr' ? (
                            <Select
                              options={debitInfo.debitOptions}
                              value={selectedDebitOption}
                              onChange={(opt) => updateLine(idx, { alloc_to: opt ? opt.value : '' })}
                              isClearable
                              isDisabled={locked}
                              placeholder="Pick a debit to allocate"
                            />
                          ) : (
                            <span className="text-muted">
                              — {thisDebitRemain !== null ? `(remaining ${thisDebitRemain})` : ''}
                            </span>
                          )}
                        </td>

                        <td>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="form-control"
                            value={line.amount}
                            onChange={(e) => updateLine(idx, { amount: e.target.value })}
                            disabled={locked}
                          />
                          {errors[`lines.${idx}.amount`] && (
                            <div className="text-danger small">{errors[`lines.${idx}.amount`]}</div>
                          )}
                        </td>

                        <td className="text-end">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeLine(idx)}
                            disabled={locked}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className="table-light">
                    <th colSpan="4" className="text-end">Total Debit</th>
                    <th>{totals.dr.toFixed(2)}</th>
                    <th></th>
                  </tr>
                  <tr className="table-light">
                    <th colSpan="4" className="text-end">Total Credit</th>
                    <th>{totals.cr.toFixed(2)}</th>
                    <th></th>
                  </tr>
                  <tr className={Number(totals.diff) === 0 ? 'table-success' : 'table-danger'}>
                    <th colSpan="4" className="text-end">Difference (Dr − Cr)</th>
                    <th>{totals.diff}</th>
                    <th></th>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Quick summary per debit */}
            {debitInfo.debits.length > 0 && (
              <div className="small text-muted mt-2">
                {debitInfo.debits.map((d, k) => {
                  const acc = accountMap[String(d.account_id)];
                  return (
                    <div key={k}>
                      Debit {k + 1}: {acc ? acc.name : `Line ${d.index + 1}`} — remaining:{' '}
                      {Number(debitInfo.remaining[k] || 0).toFixed(2)}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Narration */}
            <div className="mt-3">
              <label className="form-label">Remarks / Narration</label>
              <textarea
                className="form-control"
                rows="3"
                value={data.narration}
                onChange={(e) => setData('narration', e.target.value)}
                disabled={locked}
              />
              {errors.narration && <div className="text-danger small">{errors.narration}</div>}
            </div>
          </div>
        </div>

        <div className="card-footer d-flex gap-2 align-items-center">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={
              locked ||
              processing ||
              Number(totals.diff) !== 0 ||
              data.lines.length < 2 ||
              hasDuplicateDebitAccounts ||
              !allCreditsAllocated ||
              !debitInfo.allDebitsFullyAllocated ||
              hasOverAllocation
            }
          >
            Save
          </button>

          <Link href={route('vouchers.show', voucher.id)} className="btn btn-outline-secondary">
            View
          </Link>

          <span className="text-muted small ms-2">
            Must have at least 2 entries, debit accounts must be unique, every credit must be allocated,
            all debits must be fully allocated, and totals must match.
          </span>
        </div>
      </form>
    </AuthenticatedLayout>
  );
}
