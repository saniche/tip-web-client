import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-string-list-editor',
  templateUrl: './string-list.component.html',
  styleUrl: './string-list.component.scss',
})
export class StringListComponent {
  @Input() title = '';
  @Input() items: string[] = [];
  /** `chips` suits short values (languages, titles); `list` suits sentences. */
  @Input() variant: 'list' | 'chips' = 'list';
  @Output() readonly itemsChange = new EventEmitter<string[]>();

  protected addItem(): void {
    this.itemsChange.emit([...this.items, '']);
  }

  protected updateItem(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.itemsChange.emit(this.items.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  protected removeItem(index: number): void {
    this.itemsChange.emit(this.items.filter((_, itemIndex) => itemIndex !== index));
  }

  protected addFromInput(input: HTMLInputElement, event?: Event): void {
    event?.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    const exists = this.items.some((item) => item.trim().toLowerCase() === value.toLowerCase());
    if (!exists) {
      this.itemsChange.emit([...this.items, value]);
    }
    input.value = '';
    input.focus();
  }
}
