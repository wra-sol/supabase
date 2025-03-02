import { PermissionAction } from '@supabase/shared-types/out/constants'
import clsx from 'clsx'
import saveAs from 'file-saver'
import Papa from 'papaparse'
import { ReactNode, useState } from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconArrowUp,
  IconChevronDown,
  IconDownload,
  IconFileText,
  IconMoreHorizontal,
  IconTrash,
  IconX,
  cn,
} from 'ui'

import { useDispatch, useTrackedState } from 'components/grid/store'
import { Filter, Sort, SupaTable } from 'components/grid/types'
import { useProjectContext } from 'components/layouts/ProjectLayout/ProjectContext'
import { useTableRowsCountQuery } from 'data/table-rows/table-rows-count-query'
import { useTableRowsQuery } from 'data/table-rows/table-rows-query'
import { useCheckPermissions, useStore, useUrlState } from 'hooks'
import { useRoleImpersonationStateSnapshot } from 'state/role-impersonation-state'
import { useTableEditorStateSnapshot } from 'state/table-editor'
import RLSBannerWarning from './RLSBannerWarning'
import RefreshButton from './RefreshButton'
import FilterDropdown from './filter'
import SortPopover from './sort'

// [Joshen] CSV exports require this guard as a fail-safe if the table is
// just too large for a browser to keep all the rows in memory before
// exporting. Either that or export as multiple CSV sheets with max n rows each
const MAX_EXPORT_ROW_COUNT = 500000

export type HeaderProps = {
  table: SupaTable
  sorts: Sort[]
  filters: Filter[]
  isRefetching: boolean
  onAddColumn?: () => void
  onAddRow?: () => void
  onImportData?: () => void
  headerActions?: ReactNode
  customHeader: ReactNode
}

const Header = ({
  table,
  sorts,
  filters,
  onAddColumn,
  onAddRow,
  onImportData,
  headerActions,
  customHeader,
  isRefetching,
}: HeaderProps) => {
  const state = useTrackedState()
  const { selectedRows } = state

  return (
    <>
      <div className="flex items-center justify-between bg-surface-100 sm:px-5 py-1.5">
        {customHeader ? (
          <>
            {customHeader}
            <div className="sb-grid-header__inner">{headerActions}</div>
          </>
        ) : (
          <>
            {selectedRows.size > 0 ? (
              <RowHeader table={table} sorts={sorts} filters={filters} />
            ) : (
              <DefaultHeader
                table={table}
                isRefetching={isRefetching}
                onAddColumn={onAddColumn}
                onAddRow={onAddRow}
                onImportData={onImportData}
                headerActions={headerActions}
              />
            )}
          </>
        )}
      </div>
      <RLSBannerWarning />
    </>
  )
}

export default Header

type DefaultHeaderProps = {
  table: SupaTable
  isRefetching: boolean
  headerActions?: ReactNode
  onAddColumn?: () => void
  onAddRow?: () => void
  onImportData?: () => void
}
const DefaultHeader = ({
  table,
  isRefetching,
  headerActions,
  onAddColumn,
  onAddRow,
  onImportData,
}: DefaultHeaderProps) => {
  const canAddNew = onAddRow !== undefined || onAddColumn !== undefined

  // [Joshen] Using this logic to block both column and row creation/update/delete
  const canCreateColumns = useCheckPermissions(PermissionAction.TENANT_SQL_ADMIN_WRITE, 'columns')
  const [expandedMoreSettings, setExpandedMoreSettings] = useState(false)

  const [{ filter: filters, sort: sorts }, setParams] = useUrlState({
    arrayKeys: ['sort', 'filter'],
  })

  function handleMoreSettings() {
    setExpandedMoreSettings(!expandedMoreSettings)
  }
  return (
    <div className="flex items-center gap-0 sm:gap-4 flex-wrap sm:flex-nowrap overflow-hidden">
      <div className="flex items-center gap-1">
        <RefreshButton table={table} isRefetching={isRefetching} />
        <FilterDropdown table={table} filters={filters as string[]} setParams={setParams} />
        <SortPopover table={table} sorts={sorts as string[]} setParams={setParams} />
        {canAddNew && (
          <>
            <div className="h-[20px] w-px border-r border-control"></div>
            <div className="flex items-center gap-2">
              {canCreateColumns && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="primary"
                      size="tiny"
                      icon={<IconChevronDown size={14} strokeWidth={1.5} />}
                    >
                      Insert
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="bottom" align="start">
                    {[
                      ...(onAddRow !== undefined
                        ? [
                            <DropdownMenuItem
                              key="add-row"
                              className="group space-x-2"
                              onClick={onAddRow}
                            >
                              <div className="-mt-2 pr-1.5">
                                <div className="border border-foreground-lighter w-[15px] h-[4px]" />
                                <div className="border border-foreground-lighter w-[15px] h-[4px] my-[2px]" />
                                <div
                                  className={cn([
                                    'border border-foreground-light w-[15px] h-[4px] translate-x-0.5',
                                    'transition duration-200 group-data-[highlighted]:border-brand group-data-[highlighted]:translate-x-0',
                                  ])}
                                />
                              </div>
                              <div>
                                <p>Insert row</p>
                                <p className="text-foreground-light">
                                  Insert a new row into {table.name}
                                </p>
                              </div>
                            </DropdownMenuItem>,
                          ]
                        : []),
                      ...(onAddColumn !== undefined
                        ? [
                            <DropdownMenuItem
                              key="add-column"
                              className="group space-x-2"
                              onClick={onAddColumn}
                            >
                              <div className="flex -mt-2 pr-1.5">
                                <div className="border border-foreground-lighter w-[4px] h-[15px]" />
                                <div className="border border-foreground-lighter w-[4px] h-[15px] mx-[2px]" />
                                <div
                                  className={cn([
                                    'border border-foreground-light w-[4px] h-[15px] -translate-y-0.5',
                                    'transition duration-200 group-data-[highlighted]:border-brand group-data-[highlighted]:translate-y-0',
                                  ])}
                                />
                              </div>
                              <div>
                                <p>Insert column</p>
                                <p className="text-foreground-light">
                                  Insert a new column into {table.name}
                                </p>
                              </div>
                            </DropdownMenuItem>,
                          ]
                        : []),
                      ...(onImportData !== undefined
                        ? [
                            <DropdownMenuItem
                              key="import-data"
                              className="group space-x-2"
                              onClick={onImportData}
                            >
                              <div className="relative -mt-2">
                                <IconFileText className="-translate-x-[2px]" />
                                <IconArrowUp
                                  className={clsx(
                                    'transition duration-200 absolute bottom-0 right-0 translate-y-1 opacity-0 bg-brand-400 rounded-full',
                                    'group-data-[highlighted]:translate-y-0 group-data-[highlighted]:text-brand group-data-[highlighted]:opacity-100'
                                  )}
                                  strokeWidth={3}
                                  size={12}
                                />
                              </div>
                              <div>
                                <p>Import data from CSV</p>
                                <p className="text-foreground-light">Insert new rows from a CSV</p>
                              </div>
                            </DropdownMenuItem>,
                          ]
                        : []),
                    ]}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </>
        )}
      </div>
      <div className="space-y-1 items-end sm:hidden">
        <Button type="text" size="tiny" icon={<IconMoreHorizontal />} onClick={handleMoreSettings}>
          {!expandedMoreSettings ? 'More' : 'Hide'} Settings
        </Button>
      </div>
      <div className={!expandedMoreSettings ? `sm:h-7 h-0 overflow-hidden` : ''}>{headerActions}</div>
    </div>
  )
}

type RowHeaderProps = {
  table: SupaTable
  sorts: Sort[]
  filters: Filter[]
}
const RowHeader = ({ table, sorts, filters }: RowHeaderProps) => {
  const { ui } = useStore()
  const state = useTrackedState()
  const dispatch = useDispatch()

  const { project } = useProjectContext()
  const snap = useTableEditorStateSnapshot()

  const roleImpersonationState = useRoleImpersonationStateSnapshot()

  const [isExporting, setIsExporting] = useState(false)

  const { data } = useTableRowsQuery({
    queryKey: [table.schema, table.name],
    projectRef: project?.ref,
    connectionString: project?.connectionString,
    table,
    sorts,
    filters,
    page: snap.page,
    limit: snap.rowsPerPage,
    impersonatedRole: roleImpersonationState.role,
  })

  const { data: countData } = useTableRowsCountQuery(
    {
      queryKey: [table?.schema, table?.name, 'count'],
      projectRef: project?.ref,
      connectionString: project?.connectionString,
      table,
      filters,
      impersonatedRole: roleImpersonationState.role,
    },
    { keepPreviousData: true }
  )

  const onSelectAllRows = () => {
    dispatch({
      type: 'SELECT_ALL_ROWS',
      payload: { selectedRows: new Set(allRows.map((row) => row.idx)) },
    })
  }

  const onRowsDelete = () => {
    const numRows = allRowsSelected ? totalRows : selectedRows.size
    const rowIdxs = Array.from(selectedRows) as number[]
    const rows = allRows.filter((x) => rowIdxs.includes(x.idx))

    snap.onDeleteRows(rows, {
      allRowsSelected,
      numRows,
      callback: () => {
        dispatch({ type: 'REMOVE_ROWS', payload: { rowIdxs } })
        dispatch({
          type: 'SELECTED_ROWS_CHANGE',
          payload: { selectedRows: new Set() },
        })
      },
    })
  }

  async function onRowsExportCSV() {
    setIsExporting(true)

    if (allRowsSelected && totalRows > MAX_EXPORT_ROW_COUNT) {
      ui.setNotification({
        category: 'error',
        message: `Sorry! We're unable to support exporting of CSV for row counts larger than ${MAX_EXPORT_ROW_COUNT.toLocaleString()} at the moment.`,
      })
      return setIsExporting(false)
    }

    const rows = allRowsSelected
      ? await state.rowService!.fetchAllData(filters, sorts)
      : allRows.filter((x) => selectedRows.has(x.idx))
    const formattedRows = rows.map((row) => {
      const formattedRow = row
      Object.keys(row).map((column) => {
        if (typeof row[column] === 'object' && row[column] !== null)
          formattedRow[column] = JSON.stringify(formattedRow[column])
      })
      return formattedRow
    })

    const csv = Papa.unparse(formattedRows, {
      columns: state.table!.columns.map((column) => column.name),
    })
    const csvData = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    saveAs(csvData, `${state.table!.name}_rows.csv`)
    setIsExporting(false)
  }

  function deselectRows() {
    dispatch({
      type: 'SELECTED_ROWS_CHANGE',
      payload: { selectedRows: new Set() },
    })
  }

  const allRows = data?.rows ?? []
  const totalRows = countData?.count ?? 0
  const { selectedRows, editable, allRowsSelected } = state

  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">
        <Button
          type="default"
          style={{ padding: '3px' }}
          icon={<IconX size="tiny" strokeWidth={2} />}
          onClick={deselectRows}
        />
        <span className="text-xs text-foreground">
          {allRowsSelected
            ? `${totalRows} rows selected`
            : selectedRows.size > 1
            ? `${selectedRows.size} rows selected`
            : `${selectedRows.size} row selected`}
        </span>
        {!allRowsSelected && totalRows > allRows.length && (
          <Button type="link" onClick={() => onSelectAllRows()}>
            Select all {totalRows} rows
          </Button>
        )}
      </div>
      <div className="h-[20px] border-r border-gray-700" />
      <div className="flex items-center gap-2">
        <Button
          type="primary"
          size="tiny"
          icon={<IconDownload />}
          loading={isExporting}
          disabled={isExporting}
          onClick={onRowsExportCSV}
        >
          Export to CSV
        </Button>
        {editable && (
          <Button
            type="default"
            size="tiny"
            icon={<IconTrash size="tiny" />}
            onClick={onRowsDelete}
          >
            {allRowsSelected
              ? `Delete ${totalRows} rows`
              : selectedRows.size > 1
              ? `Delete ${selectedRows.size} rows`
              : `Delete ${selectedRows.size} row`}
          </Button>
        )}
      </div>
    </div>
  )
}
