import { Injectable, signal } from '@angular/core';
import { readUserStorage, writeUserStorage } from '../utils/user-storage';

export const DASHBOARD_WIDGETS = [
  { id: 'hero', label: 'Next step and actions' },
  { id: 'profile', label: 'Profile' },
  { id: 'applications', label: 'Applications' },
  { id: 'follow-ups', label: 'Follow-ups due' },
  { id: 'matching', label: 'Matching' },
  { id: 'tailoring', label: 'Tailored documents' },
  { id: 'interests', label: 'Interests' },
  { id: 'normalization', label: 'Job normalization' },
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]['id'];
export interface DashboardWidgetPreference {
  id: DashboardWidgetId;
  visible: boolean;
}

export interface DashboardPreferences {
  widgets: DashboardWidgetPreference[];
  checklistDismissed: boolean;
}

interface StoredPreferences {
  widgets: { id: string; visible: boolean }[];
  checklistDismissed: boolean;
}

export const DASHBOARD_PREFERENCES_KEY = 'dashboard.preferences';

export function defaultDashboardPreferences(): DashboardPreferences {
  return {
    widgets: DASHBOARD_WIDGETS.map(({ id }) => ({ id, visible: true })),
    checklistDismissed: false,
  };
}

function isStoredPreferences(value: unknown): value is StoredPreferences {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (!Array.isArray(record['widgets']) || typeof record['checklistDismissed'] !== 'boolean') return false;
  const ids = new Set<string>();
  return record['widgets'].every((item: unknown) => {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
    const widget = item as Record<string, unknown>;
    if (typeof widget['id'] !== 'string' || typeof widget['visible'] !== 'boolean' || ids.has(widget['id'])) {
      return false;
    }
    ids.add(widget['id']);
    return true;
  });
}

function reconcilePreferences(saved: StoredPreferences): DashboardPreferences {
  const defaults = defaultDashboardPreferences();
  const known = new Map(defaults.widgets.map((widget) => [widget.id as string, widget.id]));
  const widgets: DashboardWidgetPreference[] = [];
  for (const widget of saved.widgets) {
    const id = known.get(widget.id);
    if (id) {
      widgets.push({ id, visible: widget.visible });
      known.delete(id);
    }
  }
  for (const widget of defaults.widgets) {
    if (known.has(widget.id)) widgets.push(widget);
  }
  return { widgets, checklistDismissed: saved.checklistDismissed };
}

@Injectable()
export class DashboardPreferencesStore {
  private owner: string | null = null;
  readonly preferences = signal<DashboardPreferences>(defaultDashboardPreferences());
  readonly error = signal<string | null>(null);

  activate(owner: string | null): void {
    this.owner = owner;
    this.preferences.set(defaultDashboardPreferences());
    this.error.set(null);
    if (!owner) return;
    try {
      const saved = readUserStorage(owner, DASHBOARD_PREFERENCES_KEY, isStoredPreferences);
      if (saved) this.preferences.set(reconcilePreferences(saved));
    } catch (error: unknown) {
      console.error('Unable to restore dashboard preferences', error);
      this.error.set('Dashboard preferences could not be restored. Defaults are shown.');
    }
  }

  setVisible(id: DashboardWidgetId, visible: boolean): void {
    this.update({
      ...this.preferences(),
      widgets: this.preferences().widgets.map((widget) =>
        widget.id === id ? { ...widget, visible } : widget,
      ),
    });
  }

  move(id: DashboardWidgetId, direction: -1 | 1): void {
    const widgets = [...this.preferences().widgets];
    const index = widgets.findIndex((widget) => widget.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= widgets.length) return;
    [widgets[index], widgets[target]] = [widgets[target], widgets[index]];
    this.update({ ...this.preferences(), widgets });
  }

  dismissChecklist(): void {
    this.update({ ...this.preferences(), checklistDismissed: true });
  }

  private update(preferences: DashboardPreferences): void {
    this.preferences.set(preferences);
    if (!this.owner) return;
    try {
      writeUserStorage(this.owner, DASHBOARD_PREFERENCES_KEY, preferences);
      this.error.set(null);
    } catch (error: unknown) {
      console.error('Unable to save dashboard preferences', error);
      this.error.set('Dashboard preferences could not be saved and may be lost on reload.');
    }
  }
}
