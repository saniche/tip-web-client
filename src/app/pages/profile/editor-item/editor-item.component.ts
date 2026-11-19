import { Component, input, output } from '@angular/core';

let nextBodyId = 0;

/**
 * Collapsible row used by the repeating profile editors (experience, education,
 * certificates). The body stays in the DOM when collapsed so form state is kept.
 */
@Component({
  selector: 'app-editor-item',
  templateUrl: './editor-item.component.html',
  styleUrl: './editor-item.component.scss',
})
export class EditorItemComponent {
  readonly heading = input.required<string>();
  readonly meta = input('');
  readonly open = input(false);
  readonly openChange = output<boolean>();

  protected readonly bodyId = `editor-item-body-${nextBodyId++}`;
}
