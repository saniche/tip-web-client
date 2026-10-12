import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-string-list-editor',
  templateUrl: './string-list.component.html',
})
export class StringListComponent {
  @Input() title = '';
  @Input() items: string[] = [];
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
}
