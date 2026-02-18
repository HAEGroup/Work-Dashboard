import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Plus, ChevronDown, ChevronRight, MoreHorizontal, Trash2, X,
  LayoutGrid, Users, Target, Handshake, GripVertical,
  Type, Hash, Calendar as CalendarIcon, User as UserIcon,
  Mail, Phone, Link as LinkIcon, List, CheckSquare, Star,
  MessageSquare, Clock, Search,
} from 'lucide-react';
import api from '../services/api';
import PageHeader from '../components/shared/PageHeader';
import type { CrmBoard, CrmColumn, CrmGroup, CrmItem, CrmCellValue, CrmActivity, CrmColumnType, User } from '../types';

const BOARD_ICONS: Record<string, typeof LayoutGrid> = {
  'layout-grid': LayoutGrid,
  'users': Users,
  'target': Target,
  'handshake': Handshake,
};

const COLUMN_TYPE_ICONS: Record<CrmColumnType, typeof Type> = {
  TEXT: Type, NUMBER: Hash, STATUS: List, DATE: CalendarIcon,
  PERSON: UserIcon, EMAIL: Mail, PHONE: Phone, LINK: LinkIcon,
  DROPDOWN: List, CHECKBOX: CheckSquare, RATING: Star,
};

const GROUP_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

// ============================================================
// MAIN CRM PAGE
// ============================================================

export default function CrmPage() {
  const [boards, setBoards] = useState<CrmBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [boardData, setBoardData] = useState<CrmBoard | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Board creation
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  // Item detail panel
  const [selectedItem, setSelectedItem] = useState<CrmItem | null>(null);
  const [activities, setActivities] = useState<CrmActivity[]>([]);

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  async function loadBoards() {
    try {
      const { data } = await api.get('/crm/boards');
      setBoards(data.boards);
      if (!activeBoardId && data.boards.length > 0) {
        setActiveBoardId(data.boards[0].id);
      }
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadBoardData(boardId: string) {
    try {
      const { data } = await api.get(`/crm/boards/${boardId}/data`);
      setBoardData(data.board);
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load board data:', err);
    }
  }

  useEffect(() => { loadBoards(); }, []);
  useEffect(() => {
    if (activeBoardId) loadBoardData(activeBoardId);
  }, [activeBoardId]);

  async function createBoard() {
    if (!newBoardName.trim()) return;
    try {
      const { data } = await api.post('/crm/boards', { name: newBoardName });
      setBoards(prev => [...prev, data.board]);
      setActiveBoardId(data.board.id);
      setNewBoardName('');
      setShowNewBoard(false);
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  }

  async function deleteBoard(boardId: string) {
    try {
      await api.delete(`/crm/boards/${boardId}`);
      setBoards(prev => prev.filter(b => b.id !== boardId));
      if (activeBoardId === boardId) {
        const remaining = boards.filter(b => b.id !== boardId);
        setActiveBoardId(remaining.length > 0 ? remaining[0].id : null);
        setBoardData(null);
      }
    } catch (err) {
      console.error('Failed to delete board:', err);
    }
  }

  async function addGroup() {
    if (!activeBoardId) return;
    const color = GROUP_COLORS[boardData?.groups.length ? boardData.groups.length % GROUP_COLORS.length : 0];
    try {
      const { data } = await api.post(`/crm/boards/${activeBoardId}/groups`, {
        name: 'New Group',
        color,
      });
      setBoardData(prev => prev ? { ...prev, groups: [...prev.groups, data.group] } : prev);
    } catch (err) {
      console.error('Failed to create group:', err);
    }
  }

  async function addColumn(type: CrmColumnType, name: string) {
    if (!activeBoardId) return;
    try {
      const { data } = await api.post(`/crm/boards/${activeBoardId}/columns`, { name, type });
      setBoardData(prev => prev ? { ...prev, columns: [...prev.columns, data.column] } : prev);
    } catch (err) {
      console.error('Failed to create column:', err);
    }
  }

  async function deleteColumn(columnId: string) {
    try {
      await api.delete(`/crm/columns/${columnId}`);
      setBoardData(prev => prev ? {
        ...prev,
        columns: prev.columns.filter(c => c.id !== columnId),
        groups: prev.groups.map(g => ({
          ...g,
          items: g.items.map(item => ({
            ...item,
            cellValues: item.cellValues.filter(cv => cv.columnId !== columnId),
          })),
        })),
      } : prev);
    } catch (err) {
      console.error('Failed to delete column:', err);
    }
  }

  async function updateCellValue(itemId: string, columnId: string, value: any) {
    try {
      await api.put(`/crm/items/${itemId}/cells/${columnId}`, { value });
      setBoardData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          groups: prev.groups.map(g => ({
            ...g,
            items: g.items.map(item => {
              if (item.id !== itemId) return item;
              const existing = item.cellValues.find(cv => cv.columnId === columnId);
              if (existing) {
                return { ...item, cellValues: item.cellValues.map(cv => cv.columnId === columnId ? { ...cv, value } : cv) };
              }
              return { ...item, cellValues: [...item.cellValues, { id: 'temp', itemId, columnId, value }] };
            }),
          })),
        };
      });
    } catch (err) {
      console.error('Failed to update cell:', err);
    }
  }

  async function addItem(groupId: string, name: string) {
    try {
      const { data } = await api.post(`/crm/groups/${groupId}/items`, { name });
      setBoardData(prev => prev ? {
        ...prev,
        groups: prev.groups.map(g => g.id === groupId ? { ...g, items: [...g.items, data.item] } : g),
      } : prev);
    } catch (err) {
      console.error('Failed to add item:', err);
    }
  }

  async function deleteItem(itemId: string) {
    try {
      await api.delete(`/crm/items/${itemId}`);
      setBoardData(prev => prev ? {
        ...prev,
        groups: prev.groups.map(g => ({
          ...g,
          items: g.items.filter(i => i.id !== itemId),
        })),
      } : prev);
      if (selectedItem?.id === itemId) setSelectedItem(null);
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  }

  async function updateItem(itemId: string, data: Partial<CrmItem>) {
    try {
      await api.patch(`/crm/items/${itemId}`, data);
      setBoardData(prev => prev ? {
        ...prev,
        groups: prev.groups.map(g => ({
          ...g,
          items: g.items.map(i => i.id === itemId ? { ...i, ...data } : i),
        })),
      } : prev);
    } catch (err) {
      console.error('Failed to update item:', err);
    }
  }

  async function updateGroup(groupId: string, data: Partial<CrmGroup>) {
    try {
      await api.patch(`/crm/groups/${groupId}`, data);
      setBoardData(prev => prev ? {
        ...prev,
        groups: prev.groups.map(g => g.id === groupId ? { ...g, ...data } : g),
      } : prev);
    } catch (err) {
      console.error('Failed to update group:', err);
    }
  }

  async function deleteGroup(groupId: string) {
    try {
      await api.delete(`/crm/groups/${groupId}`);
      setBoardData(prev => prev ? {
        ...prev,
        groups: prev.groups.filter(g => g.id !== groupId),
      } : prev);
    } catch (err) {
      console.error('Failed to delete group:', err);
    }
  }

  async function openItemDetail(item: CrmItem) {
    setSelectedItem(item);
    try {
      const { data } = await api.get(`/crm/items/${item.id}/activities`);
      setActivities(data.activities);
    } catch (err) {
      console.error('Failed to load activities:', err);
    }
  }

  async function addActivity(content: string) {
    if (!selectedItem) return;
    try {
      const { data } = await api.post(`/crm/items/${selectedItem.id}/activities`, {
        type: 'note',
        content,
      });
      setActivities(prev => [data.activity, ...prev]);
    } catch (err) {
      console.error('Failed to add activity:', err);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="CRM" />
        <div className="flex items-center justify-center h-64 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)]">
      <PageHeader
        title="CRM"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                className="input pl-9 w-56"
                placeholder="Search items..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        }
      />

      <div className="flex gap-0 h-[calc(100%-4.5rem)]">
        {/* Board sidebar */}
        <div className="w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 pr-3 space-y-1 overflow-y-auto">
          {boards.map(board => {
            const Icon = BOARD_ICONS[board.icon] || LayoutGrid;
            return (
              <div
                key={board.id}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors ${
                  activeBoardId === board.id
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                onClick={() => setActiveBoardId(board.id)}
              >
                <Icon className="h-4 w-4 flex-shrink-0" style={{ color: board.color }} />
                <span className="truncate flex-1">{board.name}</span>
                <button
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500"
                  onClick={e => { e.stopPropagation(); deleteBoard(board.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}

          {showNewBoard ? (
            <form
              className="px-2"
              onSubmit={e => { e.preventDefault(); createBoard(); }}
            >
              <input
                className="input text-sm"
                placeholder="Board name..."
                value={newBoardName}
                onChange={e => setNewBoardName(e.target.value)}
                autoFocus
                onBlur={() => { if (!newBoardName.trim()) setShowNewBoard(false); }}
              />
            </form>
          ) : (
            <button
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 w-full"
              onClick={() => setShowNewBoard(true)}
            >
              <Plus className="h-4 w-4" /> New Board
            </button>
          )}
        </div>

        {/* Board content */}
        <div className="flex-1 overflow-auto pl-4">
          {boardData ? (
            <BoardTable
              board={boardData}
              users={users}
              searchQuery={searchQuery}
              onAddGroup={addGroup}
              onAddColumn={addColumn}
              onDeleteColumn={deleteColumn}
              onAddItem={addItem}
              onDeleteItem={deleteItem}
              onUpdateItem={updateItem}
              onUpdateGroup={updateGroup}
              onDeleteGroup={deleteGroup}
              onCellChange={updateCellValue}
              onItemClick={openItemDetail}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <LayoutGrid className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium">No board selected</p>
              <p className="text-sm mt-1">Create a board to get started</p>
            </div>
          )}
        </div>

        {/* Item detail panel */}
        {selectedItem && boardData && (
          <ItemDetailPanel
            item={selectedItem}
            columns={boardData.columns}
            users={users}
            activities={activities}
            onClose={() => setSelectedItem(null)}
            onCellChange={updateCellValue}
            onUpdateItem={updateItem}
            onAddActivity={addActivity}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// BOARD TABLE
// ============================================================

interface BoardTableProps {
  board: CrmBoard;
  users: User[];
  searchQuery: string;
  onAddGroup: () => void;
  onAddColumn: (type: CrmColumnType, name: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddItem: (groupId: string, name: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, data: any) => void;
  onUpdateGroup: (groupId: string, data: any) => void;
  onDeleteGroup: (groupId: string) => void;
  onCellChange: (itemId: string, columnId: string, value: any) => void;
  onItemClick: (item: CrmItem) => void;
}

function BoardTable({
  board, users, searchQuery, onAddGroup, onAddColumn, onDeleteColumn,
  onAddItem, onDeleteItem, onUpdateItem, onUpdateGroup, onDeleteGroup,
  onCellChange, onItemClick,
}: BoardTableProps) {
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [columnMenuFor, setColumnMenuFor] = useState<string | null>(null);

  const columnTypes: { type: CrmColumnType; label: string }[] = [
    { type: 'TEXT', label: 'Text' },
    { type: 'NUMBER', label: 'Number' },
    { type: 'STATUS', label: 'Status' },
    { type: 'DATE', label: 'Date' },
    { type: 'PERSON', label: 'Person' },
    { type: 'EMAIL', label: 'Email' },
    { type: 'PHONE', label: 'Phone' },
    { type: 'LINK', label: 'Link' },
    { type: 'DROPDOWN', label: 'Dropdown' },
    { type: 'CHECKBOX', label: 'Checkbox' },
    { type: 'RATING', label: 'Rating' },
  ];

  return (
    <div className="min-w-0">
      {board.groups.map(group => (
        <GroupSection
          key={group.id}
          group={group}
          columns={board.columns}
          users={users}
          searchQuery={searchQuery}
          onAddItem={onAddItem}
          onDeleteItem={onDeleteItem}
          onUpdateItem={onUpdateItem}
          onUpdateGroup={onUpdateGroup}
          onDeleteGroup={onDeleteGroup}
          onCellChange={onCellChange}
          onItemClick={onItemClick}
          columnMenuFor={columnMenuFor}
          setColumnMenuFor={setColumnMenuFor}
          onDeleteColumn={onDeleteColumn}
        />
      ))}

      {/* Add group + Add column row */}
      <div className="flex items-center gap-4 mt-4 mb-8">
        <button
          onClick={onAddGroup}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400"
        >
          <Plus className="h-4 w-4" /> Add Group
        </button>

        <div className="relative">
          <button
            onClick={() => setShowColumnMenu(!showColumnMenu)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400"
          >
            <Plus className="h-4 w-4" /> Add Column
          </button>
          {showColumnMenu && (
            <div className="absolute top-8 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-44">
              {columnTypes.map(ct => {
                const Icon = COLUMN_TYPE_ICONS[ct.type];
                return (
                  <button
                    key={ct.type}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => { onAddColumn(ct.type, ct.label); setShowColumnMenu(false); }}
                  >
                    <Icon className="h-4 w-4 text-gray-400" /> {ct.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// GROUP SECTION
// ============================================================

interface GroupSectionProps {
  group: CrmGroup;
  columns: CrmColumn[];
  users: User[];
  searchQuery: string;
  onAddItem: (groupId: string, name: string) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, data: any) => void;
  onUpdateGroup: (groupId: string, data: any) => void;
  onDeleteGroup: (groupId: string) => void;
  onCellChange: (itemId: string, columnId: string, value: any) => void;
  onItemClick: (item: CrmItem) => void;
  columnMenuFor: string | null;
  setColumnMenuFor: (id: string | null) => void;
  onDeleteColumn: (columnId: string) => void;
}

function GroupSection({
  group, columns, users, searchQuery,
  onAddItem, onDeleteItem, onUpdateItem, onUpdateGroup, onDeleteGroup,
  onCellChange, onItemClick, columnMenuFor, setColumnMenuFor, onDeleteColumn,
}: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(group.collapsed);
  const [newItemName, setNewItemName] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState(group.name);

  const filteredItems = searchQuery
    ? group.items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : group.items;

  function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    onUpdateGroup(group.id, { collapsed: next });
  }

  function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newItemName.trim()) return;
    onAddItem(group.id, newItemName.trim());
    setNewItemName('');
  }

  function saveGroupName() {
    setEditingName(false);
    if (groupName.trim() && groupName !== group.name) {
      onUpdateGroup(group.id, { name: groupName.trim() });
    } else {
      setGroupName(group.name);
    }
  }

  return (
    <div className="mb-6">
      {/* Group header */}
      <div className="flex items-center gap-2 mb-1 group/header">
        <button onClick={toggleCollapse} className="p-0.5" style={{ color: group.color }}>
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {editingName ? (
          <input
            className="text-sm font-semibold bg-transparent border-b-2 outline-none px-1"
            style={{ borderColor: group.color, color: group.color }}
            value={groupName}
            onChange={e => setGroupName(e.target.value)}
            onBlur={saveGroupName}
            onKeyDown={e => e.key === 'Enter' && saveGroupName()}
            autoFocus
          />
        ) : (
          <button
            className="text-sm font-semibold hover:underline"
            style={{ color: group.color }}
            onClick={() => setEditingName(true)}
          >
            {group.name}
          </button>
        )}
        <span className="text-xs text-gray-400">{group.items.length} items</span>
        <button
          className="opacity-0 group-hover/header:opacity-100 text-gray-400 hover:text-red-500 ml-1"
          onClick={() => onDeleteGroup(group.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            {/* Column headers */}
            <thead>
              <tr>
                <th className="text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-200 dark:border-gray-700 min-w-[250px] sticky left-0 bg-white dark:bg-gray-900"
                  style={{ borderLeft: `3px solid ${group.color}` }}
                >
                  Item
                </th>
                {columns.map(col => {
                  const Icon = COLUMN_TYPE_ICONS[col.type];
                  return (
                    <th
                      key={col.id}
                      className="relative text-left font-medium text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-200 dark:border-gray-700 group/col"
                      style={{ minWidth: col.width }}
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        {col.name}
                        <button
                          className="opacity-0 group-hover/col:opacity-100 ml-auto text-gray-400 hover:text-gray-600"
                          onClick={() => setColumnMenuFor(columnMenuFor === col.id ? null : col.id)}
                        >
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {columnMenuFor === col.id && (
                        <div className="absolute top-8 right-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-36">
                          <button
                            className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => { onDeleteColumn(col.id); setColumnMenuFor(null); }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete Column
                          </button>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  columns={columns}
                  users={users}
                  groupColor={group.color}
                  onCellChange={onCellChange}
                  onItemClick={onItemClick}
                  onDeleteItem={onDeleteItem}
                  onUpdateItem={onUpdateItem}
                />
              ))}
              {/* Add item row */}
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-1" style={{ borderLeft: `3px solid ${group.color}` }}>
                  <form onSubmit={handleAddItem} className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-gray-400" />
                    <input
                      className="flex-1 bg-transparent text-sm text-gray-500 placeholder-gray-400 outline-none py-1"
                      placeholder="+ Add item"
                      value={newItemName}
                      onChange={e => setNewItemName(e.target.value)}
                    />
                  </form>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ITEM ROW
// ============================================================

interface ItemRowProps {
  item: CrmItem;
  columns: CrmColumn[];
  users: User[];
  groupColor: string;
  onCellChange: (itemId: string, columnId: string, value: any) => void;
  onItemClick: (item: CrmItem) => void;
  onDeleteItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, data: any) => void;
}

function ItemRow({ item, columns, users, groupColor, onCellChange, onItemClick, onDeleteItem, onUpdateItem }: ItemRowProps) {
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(item.name);

  function saveName() {
    setEditingName(false);
    if (name.trim() && name !== item.name) {
      onUpdateItem(item.id, { name: name.trim() });
    } else {
      setName(item.name);
    }
  }

  function getCellValue(columnId: string): any {
    const cv = item.cellValues.find(v => v.columnId === columnId);
    return cv?.value;
  }

  return (
    <tr className="group/row hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
      <td
        className="px-3 py-1.5 sticky left-0 bg-white dark:bg-gray-900 group-hover/row:bg-gray-50 dark:group-hover/row:bg-gray-800/50"
        style={{ borderLeft: `3px solid ${groupColor}` }}
      >
        <div className="flex items-center gap-2">
          <button
            className="opacity-0 group-hover/row:opacity-100 text-gray-400 hover:text-red-500 flex-shrink-0"
            onClick={() => onDeleteItem(item.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {editingName ? (
            <input
              className="bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 font-medium flex-1"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              autoFocus
            />
          ) : (
            <button
              className="text-sm text-gray-900 dark:text-gray-100 font-medium hover:text-primary-600 dark:hover:text-primary-400 text-left flex-1 truncate"
              onDoubleClick={() => setEditingName(true)}
              onClick={() => onItemClick(item)}
            >
              {item.name}
            </button>
          )}
        </div>
      </td>
      {columns.map(col => (
        <td key={col.id} className="px-3 py-1.5">
          <CellEditor
            column={col}
            value={getCellValue(col.id)}
            users={users}
            onChange={value => onCellChange(item.id, col.id, value)}
          />
        </td>
      ))}
    </tr>
  );
}

// ============================================================
// CELL EDITOR
// ============================================================

interface CellEditorProps {
  column: CrmColumn;
  value: any;
  users: User[];
  onChange: (value: any) => void;
}

function CellEditor({ column, value, users, onChange }: CellEditorProps) {
  const [editing, setEditing] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showDropdown]);

  switch (column.type) {
    case 'TEXT':
    case 'EMAIL':
    case 'PHONE':
    case 'LINK':
      return editing ? (
        <input
          className="bg-transparent outline-none text-sm w-full border-b border-primary-400"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={e => e.key === 'Enter' && setEditing(false)}
          autoFocus
        />
      ) : (
        <div
          className="text-sm text-gray-700 dark:text-gray-300 cursor-text min-h-[1.5rem] truncate"
          onClick={() => setEditing(true)}
        >
          {column.type === 'LINK' && value ? (
            <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline" onClick={e => e.stopPropagation()}>
              {value}
            </a>
          ) : (
            value || <span className="text-gray-300 dark:text-gray-600">-</span>
          )}
        </div>
      );

    case 'NUMBER':
      return editing ? (
        <input
          type="number"
          className="bg-transparent outline-none text-sm w-full border-b border-primary-400"
          value={value ?? ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          onBlur={() => setEditing(false)}
          onKeyDown={e => e.key === 'Enter' && setEditing(false)}
          autoFocus
        />
      ) : (
        <div className="text-sm text-gray-700 dark:text-gray-300 cursor-text min-h-[1.5rem]" onClick={() => setEditing(true)}>
          {value != null ? value : <span className="text-gray-300 dark:text-gray-600">-</span>}
        </div>
      );

    case 'STATUS':
    case 'DROPDOWN': {
      const options: Array<{ label: string; color: string }> = column.config?.options || [];
      const selected = options.find(o => o.label === value);
      return (
        <div ref={ref} className="relative">
          <button
            className="rounded-full px-3 py-0.5 text-xs font-medium text-white min-w-[80px] text-center"
            style={{ backgroundColor: selected?.color || '#d1d5db' }}
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {value || ''}
          </button>
          {showDropdown && (
            <div className="absolute top-7 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-40">
              {options.map(opt => (
                <button
                  key={opt.label}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => { onChange(opt.label); setShowDropdown(false); }}
                >
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: opt.color }} />
                  <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
                </button>
              ))}
              {value && (
                <button
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
                  onClick={() => { onChange(null); setShowDropdown(false); }}
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    case 'DATE':
      return (
        <input
          type="date"
          className="bg-transparent text-sm text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
          value={value || ''}
          onChange={e => onChange(e.target.value || null)}
        />
      );

    case 'PERSON': {
      const selectedUser = users.find(u => u.id === value);
      return (
        <div ref={ref} className="relative">
          <button
            className="flex items-center gap-1.5 text-sm"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {selectedUser ? (
              <>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 text-xs font-medium">
                  {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{selectedUser.firstName}</span>
              </>
            ) : (
              <span className="text-gray-300 dark:text-gray-600">-</span>
            )}
          </button>
          {showDropdown && (
            <div className="absolute top-7 left-0 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-48">
              {users.map(u => (
                <button
                  key={u.id}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => { onChange(u.id); setShowDropdown(false); }}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 text-xs font-medium">
                    {u.firstName[0]}{u.lastName[0]}
                  </span>
                  {u.firstName} {u.lastName}
                </button>
              ))}
              {value && (
                <button
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
                  onClick={() => { onChange(null); setShowDropdown(false); }}
                >
                  <X className="h-3 w-3" /> Unassign
                </button>
              )}
            </div>
          )}
        </div>
      );
    }

    case 'CHECKBOX':
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={e => onChange(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer"
        />
      );

    case 'RATING': {
      const stars = 5;
      const current = typeof value === 'number' ? value : 0;
      return (
        <div className="flex gap-0.5">
          {Array.from({ length: stars }).map((_, i) => (
            <button
              key={i}
              onClick={() => onChange(current === i + 1 ? 0 : i + 1)}
              className="p-0"
            >
              <Star
                className={`h-4 w-4 ${i < current ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
              />
            </button>
          ))}
        </div>
      );
    }

    default:
      return <span className="text-sm text-gray-400">-</span>;
  }
}

// ============================================================
// ITEM DETAIL PANEL
// ============================================================

interface ItemDetailPanelProps {
  item: CrmItem;
  columns: CrmColumn[];
  users: User[];
  activities: CrmActivity[];
  onClose: () => void;
  onCellChange: (itemId: string, columnId: string, value: any) => void;
  onUpdateItem: (itemId: string, data: any) => void;
  onAddActivity: (content: string) => void;
}

function ItemDetailPanel({
  item, columns, users, activities,
  onClose, onCellChange, onUpdateItem, onAddActivity,
}: ItemDetailPanelProps) {
  const [activityText, setActivityText] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(item.name);

  // Update local state when item changes
  useEffect(() => { setName(item.name); }, [item.name]);

  function saveName() {
    setEditingName(false);
    if (name.trim() && name !== item.name) onUpdateItem(item.id, { name: name.trim() });
    else setName(item.name);
  }

  function handleAddActivity(e: React.FormEvent) {
    e.preventDefault();
    if (!activityText.trim()) return;
    onAddActivity(activityText.trim());
    setActivityText('');
  }

  function getCellValue(columnId: string): any {
    const cv = item.cellValues.find(v => v.columnId === columnId);
    return cv?.value;
  }

  return (
    <div className="w-96 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
      <div className="sticky top-0 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-400 uppercase tracking-wider">Item Details</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Item name */}
        {editingName ? (
          <input
            className="text-lg font-semibold bg-transparent outline-none border-b-2 border-primary-400 w-full text-gray-900 dark:text-white"
            value={name}
            onChange={e => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => e.key === 'Enter' && saveName()}
            autoFocus
          />
        ) : (
          <h2
            className="text-lg font-semibold text-gray-900 dark:text-white cursor-text hover:text-primary-600"
            onClick={() => setEditingName(true)}
          >
            {item.name}
          </h2>
        )}

        {/* Fields */}
        <div className="space-y-3">
          {columns.map(col => (
            <div key={col.id} className="flex items-start gap-3">
              <span className="text-xs text-gray-500 dark:text-gray-400 w-24 flex-shrink-0 pt-1 font-medium">{col.name}</span>
              <div className="flex-1">
                <CellEditor
                  column={col}
                  value={getCellValue(col.id)}
                  users={users}
                  onChange={value => onCellChange(item.id, col.id, value)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Activity log */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Activity
          </h3>

          <form onSubmit={handleAddActivity} className="mb-4">
            <textarea
              className="input text-sm resize-none"
              rows={2}
              placeholder="Write a note..."
              value={activityText}
              onChange={e => setActivityText(e.target.value)}
            />
            <button type="submit" className="btn-primary btn-sm mt-2" disabled={!activityText.trim()}>
              Add Note
            </button>
          </form>

          <div className="space-y-3">
            {activities.map(act => (
              <div key={act.id} className="flex gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5">
                  {act.user?.firstName?.[0]}{act.user?.lastName?.[0]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                      {act.user?.firstName} {act.user?.lastName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(act.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{act.content}</p>
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No activity yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
