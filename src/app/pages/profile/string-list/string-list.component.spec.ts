import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { StringListComponent } from './string-list.component';

describe('StringListComponent', () => {
  it('renders bullet items and emits added, edited, and removed strings', async () => {
    await TestBed.configureTestingModule({ imports: [StringListComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StringListComponent);
    fixture.componentRef.setInput('title', 'Core Competences');
    fixture.componentRef.setInput('items', ['Planning', 'Communication']);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('ul > li')).toHaveLength(2);

    const emitted: string[][] = [];
    fixture.componentInstance.itemsChange.subscribe((items) => emitted.push(items));

    const addButton = fixture.nativeElement.querySelector(
      'button:not([aria-label])',
    ) as HTMLButtonElement;
    addButton.click();
    expect(emitted.at(-1)).toEqual(['Planning', 'Communication', '']);

    fixture.componentRef.setInput('items', emitted.at(-1));
    fixture.detectChanges();
    const firstItem = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    firstItem.value = 'Strategic planning';
    firstItem.dispatchEvent(new Event('input'));
    expect(emitted.at(-1)).toEqual(['Strategic planning', 'Communication', '']);

    fixture.componentRef.setInput('items', emitted.at(-1));
    fixture.detectChanges();
    const removeButton = fixture.nativeElement.querySelector(
      '[aria-label="Remove Core Competences item 2"]',
    ) as HTMLButtonElement;
    removeButton.click();
    expect(emitted.at(-1)).toEqual(['Strategic planning', '']);
  });

  it('shows short values as removable chips and adds trimmed, unique entries with Enter', async () => {
    await TestBed.configureTestingModule({ imports: [StringListComponent] }).compileComponents();
    const fixture = TestBed.createComponent(StringListComponent);
    fixture.componentRef.setInput('title', 'Languages');
    fixture.componentRef.setInput('variant', 'chips');
    fixture.componentRef.setInput('items', ['English']);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const emitted: string[][] = [];
    fixture.componentInstance.itemsChange.subscribe((items) => emitted.push(items));

    expect(Array.from(root.querySelectorAll('.string-chips__chip')).map((chip) => chip.textContent!.replace('×', '').trim())).toEqual(['English']);

    const input = root.querySelector<HTMLInputElement>('input[aria-label="Add Languages"]')!;
    input.value = '  French ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    expect(emitted.at(-1)).toEqual(['English', 'French']);
    expect(input.value).toBe('');

    input.value = 'english';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    input.value = '   ';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    expect(emitted).toHaveLength(1);

    root.querySelector<HTMLButtonElement>('[aria-label="Remove Languages English"]')!.click();
    expect(emitted.at(-1)).toEqual([]);
  });
});
