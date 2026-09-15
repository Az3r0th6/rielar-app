import React from 'react';
import { Navigation, Map, AlertCircle, Clock, Star, MoreHorizontal } from 'lucide-react';
import { triggerHaptic, playChimeSound } from '../utils/notifications';

export default function TabBar({ activeTab, onTabChange, alertsCount = 0, isHidden = false }) {
  const badgeCount = Number(alertsCount) || 0;

  const tabs = [
    { id: 'nearby', label: 'Cerca', icon: Navigation },
    { id: 'map', label: 'Mapa', icon: Map },
    { id: 'lines', label: 'Estado', icon: AlertCircle, badge: badgeCount },
    { id: 'planner', label: 'Horarios', icon: Clock },
    { id: 'favorites', label: 'Favoritos', icon: Star },
    { id: 'more', label: 'Otros', icon: MoreHorizontal },
  ];

  const handleSelect = (tabId) => {
    triggerHaptic('light');
    playChimeSound('click');
    onTabChange(tabId);
  };

  return (
    <nav className={`ios-tab-bar ${isHidden ? 'tab-bar-hidden' : ''}`} aria-label="Navegación principal">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            className={`tab-item ${isActive ? 'active' : ''}`}
            onClick={() => handleSelect(tab.id)}
            aria-selected={isActive}
            role="tab"
          >
            <div style={{ position: 'relative' }}>
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {tab.badge > 0 && (
                <span className="tab-badge">{tab.badge}</span>
              )}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
