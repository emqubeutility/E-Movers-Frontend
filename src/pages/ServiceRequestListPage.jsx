import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import Topbar from '../components/layout/Topbar.jsx';
import { ConfirmDeleteModal } from '../components/ui/Confirm.jsx';
import { Badge } from '../components/ui/Display.jsx';
import Dropdown from '../components/ui/Dropdown.jsx';
import { ActiveFilters } from '../components/ui/ListKit.jsx';
import { QueryError } from '../components/ui/QueryState.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { usePermissions } from '../features/auth/permissions.js';
import { FileThumb } from '../features/file/ImageUpload.jsx';
import MasterList from '../features/master/MasterList.jsx';
import {
  useDeleteServiceRequest,
  useRequestLookups,
  useRequestOptions,
  useServiceRequests,
} from '../features/service-request/hooks.js';
import { useListState } from '../hooks/useListState.js';
import { ACTION, MENU } from '../lib/permissions.js';
import { REQUEST_STAGE, REQUEST_STATUS } from '../lib/requestStatus.js';

// Stage and status filters hold parameter values.
const EMPTY_FILTERS = { serviceGroupId: '', stageValue: '', statusValue: '', executiveId: '' };
const STATUS_TONE = {
  [REQUEST_STATUS.ASSIGNED]: 'warning',
  [REQUEST_STATUS.CONTACTED]: 'success',
  [REQUEST_STATUS.DROPPED]: 'neutral',
  [REQUEST_STATUS.ENQUIRY_SCHEDULED]: 'warning',
  [REQUEST_STATUS.SURVEY_COMPLETED]: 'success',
  [REQUEST_STATUS.SURVEY_DROPPED]: 'neutral',
};
const ACTION_TEXT = {
  CREATED: 'Enquiry created',
  UPDATED: 'Enquiry updated',
  CONTACTED: 'Enquiry contacted',
  DROPPED: 'Enquiry dropped',
  SURVEY_UPDATED: 'Survey updated',
  SURVEY_COMPLETED: 'Survey completed',
  SURVEY_DROPPED: 'Survey dropped',
};

const pad = (value) => String(value).padStart(2, '0');
/** "2026-09-10" or a timestamp -> "10/09/2026". */
function dayText(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(value);
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}
/** A timestamp -> "03:40 PM". */
function timeText(value) {
  const date = new Date(value);
  const hour = date.getHours() % 12 || 12;
  return `${pad(hour)}:${pad(date.getMinutes())} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
}
/** Whole days since the request was created. */
const ageInDays = (value) => Math.max(0, Math.floor((Date.now() - new Date(value)) / 86400000));
/** "Enquiry contacted by Ethel on 24/11/2026", from the request's latest log entry. */
function lastActionOf(row) {
  const last = row.lastAction;
  if (!last) return '—';
  const by = last.byName ? ` by ${last.byName}` : '';
  return `${ACTION_TEXT[last.action] ?? last.action}${by} on ${dayText(last.at)}`;
}

export default function ServiceRequestListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { can, role } = usePermissions();
  // An executive only ever sees their own requests, so the executive filter is not shown.
  const isExecutive = role === 'EXECUTIVE';
  const list = useListState({ filters: EMPTY_FILTERS });
  const lookups = useRequestLookups();
  const options = useRequestOptions();
  const requests = useServiceRequests(list.query);
  const remove = useDeleteServiceRequest();
  const [toDelete, setToDelete] = useState(null);

  const canCreate = can(MENU.SERVICE_REQUESTS, ACTION.CREATE);
  const groups = options.data?.serviceGroups ?? [];
  // Options use the parameter value; the status list follows the chosen stage.
  const byValue = (item) => ({
    value: String(item.parameterValue),
    label: item.label,
    parentValue: item.parentValue,
  });
  const stages = (lookups.data?.REQUEST_STAGE ?? []).map(byValue);
  const allStatuses = (lookups.data?.REQUEST_STATUS ?? []).map(byValue);
  const statuses = list.filters.stageValue
    ? allStatuses.filter((item) => String(item.parentValue) === list.filters.stageValue)
    : allStatuses;
  function pickStage(value) {
    list.setFilter('stageValue', value);
    const status = allStatuses.find((item) => item.value === list.filters.statusValue);
    // A status of another stage no longer applies.
    if (value && status && String(status.parentValue) !== value) list.setFilter('statusValue', '');
  }
  // Executives of the organization chosen in the menu (all of them on "All organizations").
  const executives = (options.data?.executives ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const labelOf = (items, value) => items.find((item) => item.value === value)?.label ?? value;

  const chips = [
    list.filters.serviceGroupId && {
      key: 'serviceGroupId',
      label: 'Service group',
      value: labelOf(groups, list.filters.serviceGroupId),
      onRemove: () => list.setFilter('serviceGroupId', ''),
    },
    list.filters.executiveId && {
      key: 'executiveId',
      label: 'Executive',
      value: labelOf(executives, list.filters.executiveId),
      onRemove: () => list.setFilter('executiveId', ''),
    },
    list.filters.stageValue && {
      key: 'stageValue',
      label: 'Stage',
      value: labelOf(stages, list.filters.stageValue),
      onRemove: () => list.setFilter('stageValue', ''),
    },
    list.filters.statusValue && {
      key: 'statusValue',
      label: 'Status',
      value: labelOf(allStatuses, list.filters.statusValue),
      onRemove: () => list.setFilter('statusValue', ''),
    },
  ].filter(Boolean);

  async function confirmDelete() {
    try {
      await remove.mutateAsync(toDelete.id);
      toast.success('Service request deleted');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setToDelete(null);
    }
  }

  return (
    <>
      <Topbar
        title="Service requests"
        actions={
          canCreate && (
            <Link to="/service-requests/new" className="btn btn-primary">
              <Plus />
              New request
            </Link>
          )
        }
      />

      <div className="card card-flush">
        <div className="filter-bar">
          <div className="input-group search" role="search">
            <Search />
            <input
              className="input"
              type="search"
              placeholder="Search by number or title…"
              aria-label="Search service requests"
              value={list.search}
              onChange={(event) => list.setSearch(event.target.value)}
            />
          </div>
          <Dropdown
            pill
            clearable
            placeholder="Service group"
            aria-label="Filter by service group"
            options={groups}
            value={list.filters.serviceGroupId}
            onChange={(value) => list.setFilter('serviceGroupId', value)}
          />
          {!isExecutive && (
            <Dropdown
              pill
              clearable
              search
              placeholder="Executive"
              aria-label="Filter by executive"
              options={executives}
              value={list.filters.executiveId}
              onChange={(value) => list.setFilter('executiveId', value)}
            />
          )}
          <Dropdown
            pill
            clearable
            placeholder="Stage"
            aria-label="Filter by stage"
            options={stages}
            value={list.filters.stageValue}
            onChange={pickStage}
          />
          <Dropdown
            pill
            clearable
            search
            placeholder="Status"
            aria-label="Filter by status"
            options={statuses}
            value={list.filters.statusValue}
            onChange={(value) => list.setFilter('statusValue', value)}
          />
          <span className="spacer" />
        </div>
        <ActiveFilters chips={chips} onClearAll={list.clearFilters} />

        <QueryError error={requests.error} onRetry={() => requests.refetch()} />

        <MasterList
          caption="Service requests"
          rows={requests.data?.items ?? []}
          loading={requests.isPending}
          sort={list.sort}
          onSort={list.setSort}
          page={list.page}
          pageSize={list.pageSize}
          meta={requests.data?.meta}
          onPage={list.setPage}
          onPageSize={list.setPageSize}
          canEdit={can(MENU.SERVICE_REQUESTS, ACTION.EDIT)}
          canDelete={can(MENU.SERVICE_REQUESTS, ACTION.DELETE)}
          // A request in the survey stage opens its survey.
          onEdit={(row) =>
            navigate(
              row.stageValue === REQUEST_STAGE.SURVEY
                ? `/service-requests/${row.id}/survey`
                : `/service-requests/${row.id}/edit`,
            )
          }
          onDelete={setToDelete}
          emptyTitle={
            list.hasFilters ? 'No requests match your filters' : 'No service requests yet'
          }
          emptyText={
            list.hasFilters
              ? 'Try a different search or clear the filters.'
              : 'Create the first request.'
          }
          columns={[
            { key: 'requestNo', label: 'Ref', sortBy: 'requestNo', className: 'nowrap' },
            {
              key: 'createdAt',
              label: 'Date',
              sortBy: 'createdAt',
              className: 'nowrap',
              render: (row) => (
                <div>
                  {dayText(row.createdAt)}
                  <div className="muted small">{timeText(row.createdAt)}</div>
                </div>
              ),
            },
            {
              key: 'moveDate',
              label: 'Move date',
              sortBy: 'moveDate',
              className: 'nowrap',
              render: (row) => (row.moveDate ? dayText(row.moveDate) : '—'),
            },
            {
              key: 'serviceGroupLabel',
              label: 'Service',
              render: (row) => (
                <span
                  className="service-icon"
                  title={[row.serviceGroupLabel, row.serviceTypeName].filter(Boolean).join(' · ')}
                >
                  {row.serviceGroupFileId ? (
                    <FileThumb fileId={row.serviceGroupFileId} />
                  ) : (
                    <Badge tone="brand" dot={false}>
                      {row.serviceGroupLabel}
                    </Badge>
                  )}
                </span>
              ),
            },
            {
              key: 'executiveName',
              label: 'Executive',
              render: (row) => row.executiveName ?? '—',
            },
            {
              key: 'title',
              label: 'Title',
              sortBy: 'title',
              render: (row) => <strong>{row.title}</strong>,
            },
            {
              key: 'customerName',
              label: 'Customer name',
              render: (row) => (
                <div>
                  {row.customerName}
                  {row.customerPhone && <div className="muted small">{row.customerPhone}</div>}
                </div>
              ),
            },
            { key: 'stage', label: 'Stage', render: (row) => row.stageLabel ?? '—' },
            {
              key: 'statusLabel',
              label: 'Status',
              render: (row) => (
                <Badge tone={STATUS_TONE[row.statusValue] ?? 'brand'}>{row.statusLabel}</Badge>
              ),
            },
            {
              key: 'age',
              label: 'Age',
              className: 'nowrap',
              render: (row) => `${ageInDays(row.createdAt)} d`,
            },
            // Filled in once quotes are built.
            { key: 'quoteValue', label: 'Quote value', render: () => '—' },
            {
              key: 'lastAction',
              label: 'Last action',
              render: (row) => (
                <span className="cell-trunc" title={lastActionOf(row)}>
                  {lastActionOf(row)}
                </span>
              ),
            },
          ]}
        />
      </div>

      <ConfirmDeleteModal
        open={Boolean(toDelete)}
        title="Delete service request?"
        message={toDelete && `${toDelete.requestNo} · ${toDelete.title} will be removed.`}
        busy={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
