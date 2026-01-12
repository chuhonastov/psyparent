import React from 'react';
import { NavLink } from 'react-router-dom';
import { routes } from '../app/routes';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `navBtn ${isActive ? 'active' : ''}`}
    >
      <span>{label}</span>
    </NavLink>
  );
}

export default function BottomNav() {
  return (
    <div className="bottomNav">
      <div className="bottomNavInner">
        <NavItem to={routes.home} label="Главная" />
        <NavItem to={routes.diagnoses} label="Диагнозы" />
        <NavItem to={routes.medications} label="Лечение" />
        <NavItem to={routes.visit} label="К врачу" />
      </div>
    </div>
  );
}
