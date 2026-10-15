import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ButtonComponent } from '@shared/ui/button/button.component';
import { CardComponent } from '@shared/ui/card/card.component';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'sysde-not-found-page',
  imports: [RouterLink, ButtonComponent, CardComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ui-card>
      <ui-empty-state
        icon="map"
        tone="amber"
        title="Page introuvable"
        description="L'adresse demandée n'existe pas ou a été déplacée."
      >
        <a ui-button variant="primary" routerLink="/tableau-de-bord">Retour au dashboard</a>
      </ui-empty-state>
    </ui-card>
  `,
})
export class NotFoundPage {}
