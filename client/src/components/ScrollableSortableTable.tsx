import React, { useEffect, useRef } from "react";

export type TableColumn = {
  header: React.ReactNode;
  headerStyle?: React.CSSProperties;
};

export type ScrollableSortableTableProps<T> = {
  items: T[];
  sortCompare: (a: T, b: T) => number;
  columns: TableColumn[];
  renderRow: (item: T) => React.ReactNode;
  /** Re-run scroll-to-bottom when these values change (e.g. after data loads). */
  scrollDeps?: React.DependencyList;
  /** When false, the table stays at the top on load. Defaults to true. */
  scrollToBottom?: boolean;
  emptyMessage?: React.ReactNode;
  /** When true, render emptyMessage as a row inside the table body. */
  emptyInTable?: boolean;
  containerStyle?: React.CSSProperties;
  tableStyle?: React.CSSProperties;
};

const defaultContainerStyle: React.CSSProperties = {
  background: "#fff",
  borderRadius: 8,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  overflow: "hidden",
  maxHeight: "70vh",
  overflowY: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "0.8125rem",
};

const theadRowStyle: React.CSSProperties = {
  background: "#f8f8f8",
  textAlign: "left",
  position: "sticky",
  top: 0,
  zIndex: 1,
  boxShadow: "0 1px 0 0 #eee",
};

const defaultThStyle: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
};

export function ScrollableSortableTable<T>({
  items,
  sortCompare,
  columns,
  renderRow,
  scrollDeps = [],
  scrollToBottom = true,
  emptyMessage,
  emptyInTable = false,
  containerStyle,
  tableStyle: tableStyleOverride,
}: ScrollableSortableTableProps<T>) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sortedItems = [...items].sort(sortCompare);

  useEffect(() => {
    if (!scrollToBottom) return;
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToBottom, sortedItems.length, ...scrollDeps]);

  if (items.length === 0 && emptyMessage && !emptyInTable) {
    return (
      <p
        style={{
          padding: "1.25rem 0.75rem",
          margin: 0,
          color: "#666",
        }}
      >
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{ ...defaultContainerStyle, ...containerStyle }}
    >
      <table style={{ ...tableStyle, ...tableStyleOverride }}>
        <thead>
          <tr style={theadRowStyle}>
            {columns.map((col, i) => (
              <th
                key={i}
                style={{ ...defaultThStyle, ...col.headerStyle }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedItems.length === 0 && emptyMessage && emptyInTable ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{
                  padding: "1.25rem 0.75rem",
                  textAlign: "center",
                  color: "#666",
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedItems.map((item) => renderRow(item))
          )}
        </tbody>
      </table>
    </div>
  );
}
