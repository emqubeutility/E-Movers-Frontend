import { Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '../../components/ui/Display.jsx';
import { ActionMenu } from '../../components/ui/Dropdown.jsx';
import { SortHeader } from '../../components/ui/ListKit.jsx';
import { TableLoading } from '../../components/ui/Loader.jsx';
import { TableFoot } from '../../components/ui/Pager.jsx';

/**
 * The table body of a master-data list. Pages own their filters and queries; this keeps the
 * columns, row actions and footer identical across customers and companies.
 *
 * columns: [{ key, label, sortBy?, render?(row), className? }]
 */
export default function MasterList({
  caption,
  columns,
  rows,
  loading,
  sort,
  onSort,
  page,
  pageSize,
  meta,
  onPage,
  onPageSize,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
  canDeleteRow,
  emptyTitle = 'Nothing here yet',
  emptyText = 'Create the first record to get started.',
}) {
  if (!loading && rows.length === 0) {
    return <EmptyState title={emptyTitle} text={emptyText} />;
  }

  return (
    <>
      <div className="table-wrap">
        <table className={`data-table${loading ? ' is-dimmed' : ''}`}>
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              <th className="col-menu">
                <span className="sr-only">Actions</span>
              </th>
              {columns.map((column) =>
                column.sortBy ? (
                  <SortHeader
                    key={column.key}
                    column={column.sortBy}
                    label={column.label}
                    sort={sort}
                    onSort={onSort}
                  />
                ) : (
                  <th key={column.key} scope="col">
                    {column.label}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {loading && <TableLoading colSpan={columns.length + 1} />}
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="col-menu">
                  <ActionMenu
                    items={[
                      canEdit && { label: 'Edit', icon: Pencil, onClick: () => onEdit(row) },
                      canDelete && (!canDeleteRow || canDeleteRow(row)) && {
                        label: 'Delete',
                        icon: Trash2,
                        danger: true,
                        onClick: () => onDelete(row),
                      },
                    ].filter(Boolean)}
                  />
                </td>
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TableFoot
        page={page}
        pageSize={pageSize}
        total={meta?.total ?? 0}
        onPage={onPage}
        onPageSize={onPageSize}
      />
    </>
  );
}
