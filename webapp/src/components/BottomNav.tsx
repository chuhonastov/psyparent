import React from 'react';
import { NavLink } from 'react-router-dom';
import { routes } from '../app/routes';

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 3.2l9 7.1v10.5c0 .7-.6 1.2-1.2 1.2H15v-7h-6v7H4.2C3.5 22 3 21.4 3 20.8V10.3l9-7.1zm0 2.4L5 11v9h2.8v-7h8.4v7H19v-9l-7-5.4z"
      />
    </svg>
  );
}

function IconList() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 6h14v2H7V6zm0 5h14v2H7v-2zm0 5h14v2H7v-2zM3 6h2v2H3V6zm0 5h2v2H3v-2zm0 5h2v2H3v-2z"
      />
    </svg>
  );
}

function IconPill() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M17.7 6.3a6 6 0 0 0-8.5 0l-2.9 2.9a6 6 0 0 0 8.5 8.5l2.9-2.9a6 6 0 0 0 0-8.5zm-1.4 7.1l-2.9 2.9a4 4 0 1 1-5.7-5.7l1.1-1.1 7.5 7.5zM9.9 8.7l.7-.7a4 4 0 0 1 5.7 5.7l-.7.7-5.7-5.7z"
      />
    </svg>
  );
}

function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v2.5c0 .4.5.6.8.3L13.6 20H20c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14h-7.1l-3.9 3V18H4V6h16v12z"
      />
    </svg>
  );
}

function NavItem({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `navBtn ${isActive ? 'active' : ''}`}
    >
      <span className="navIcon">{icon}</span>
      <span className="navLabel">{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <nav className="bottomNav" aria-label="Навигация">
      <div className="bottomNavInner">
        <NavItem to={routes.home} label="Главная" icon={<IconHome />} />
        <NavItem to={routes.diagnoses} label="Диагнозы" icon={<IconList />} />
        <NavItem to={routes.medications} label="Лечение" icon={<IconPill />} />
        <NavItem to={routes.visit} label="К врачу" icon={<IconChat />} />
      </div>
    </nav>
  );
}
