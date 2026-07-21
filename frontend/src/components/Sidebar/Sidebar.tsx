import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

interface NavItem {
  to: string;
  label: string;
  end: boolean;
}

const MENTOR_ROLES = ['Mentor', 'Admin', 'SuperAdmin'];
const ADMIN_ROLES = ['Admin', 'SuperAdmin'];

// Пункты меню добавляются по мере появления реальных страниц.
const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Дашборд', end: true },
  { to: '/universities', label: 'Университеты', end: false },
  { to: '/calendar', label: 'Календарь', end: false },
  { to: '/settings', label: 'Настройки', end: false },
];

const MENTOR_NAV_ITEM: NavItem = { to: '/mentor/students', label: 'Заявки студентов', end: false };
const ADMIN_NAV_ITEM: NavItem = { to: '/admin', label: 'Админ-панель', end: false };

export function Sidebar(): JSX.Element {
  const currentUser = useAuthStore((state) => state.user);
  const isMentorOrAdmin = MENTOR_ROLES.includes(currentUser?.role ?? '');
  const isAdmin = ADMIN_ROLES.includes(currentUser?.role ?? '');

  const items = [
    ...NAV_ITEMS,
    ...(isMentorOrAdmin ? [MENTOR_NAV_ITEM] : []),
    ...(isAdmin ? [ADMIN_NAV_ITEM] : []),
  ];

  return (
    <aside className="hidden w-56 shrink-0 border-r border-ink-100 bg-ink-0 px-4 py-6 md:block">
      <nav className="space-y-1">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }: { isActive: boolean }) =>
              `block rounded px-3 py-2 text-sm font-medium transition-colors ${
                isActive ? 'bg-ink-900 text-ink-0' : 'text-ink-700 hover:bg-ink-50'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
