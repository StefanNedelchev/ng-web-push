import { JsonPipe } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AfterViewInit, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { lastValueFrom, timer } from 'rxjs';
import { mergeMap, take, tap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HttpClientModule, JsonPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements AfterViewInit {
  public pushSubscription = signal<PushSubscription | null>(null);
  public notificationMessages = signal<unknown[]>([]);
  public lastClickEvent = signal<string | null>(null);
  public errorMessage = signal<string | null>(null);

  private readonly netlifyApiBaseUrl = 'http://localhost:8888/api';
  private readonly serverPublicKey = 'BLBXQXDsaEO-HGQZZK0a0_1BNA16631qK0kvpj3NbD6p4LKwN6Ks4VPnwuvtYSyR5Yw5qdGIyVLgC_oH1oBIYa8';

  constructor(
    private readonly swPush: SwPush,
    private readonly http: HttpClient
  ) { }

  public ngAfterViewInit(): void {
    this.swPush.subscription.pipe(take(1)).subscribe((sub) => {
      this.pushSubscription.set(sub);
    });

    this.swPush.messages.subscribe((m) => {
      this.notificationMessages.update((oldValue) => ([...oldValue, m]));
    });

    this.swPush.notificationClicks.pipe(
      tap((clickEvent) => {
        this.lastClickEvent.set(`${clickEvent.action} | ${clickEvent.notification.title}`);
      }),
      mergeMap(() => timer(5000)),
      take(1),
    )
      .subscribe(() => this.lastClickEvent.set(null));
  }

  public async subscribe(): Promise<void> {
    this.errorMessage.set(null);

    if (!this.swPush.isEnabled) {
      this.errorMessage.set('❌ Service Worker not enabled');
      return;
    }

    const sub = await this.swPush.requestSubscription({ serverPublicKey: this.serverPublicKey });

    try {
      await lastValueFrom(
        this.http.post(`${this.netlifyApiBaseUrl}/subscribe`, sub.toJSON(), {
          headers: {
            'content-type': 'application/json',
          },
        })
      );

      this.pushSubscription.set(sub);
    } catch (err) {
      this.errorMessage.set((err as Error).message);
    }
  }

  public async unsubscribe(): Promise<void> {
    this.errorMessage.set(null);

    if (!this.swPush.isEnabled || this.pushSubscription() === null) {
      return;
    }

    try {
      await lastValueFrom(
        this.http.post(`${this.netlifyApiBaseUrl}/unsubscribe`, this.pushSubscription(), {
          headers: {
            'content-type': 'application/json',
          },
        }),
      );
      await this.swPush.unsubscribe();
      this.pushSubscription.set(null);
    } catch (err) {
      this.errorMessage.set((err as Error).message);
    }
  }

  public trigger(): void {
    this.errorMessage.set(null);

    if (!this.swPush.isEnabled || this.pushSubscription() === null) {
      return;
    }

    this.http.post(`${this.netlifyApiBaseUrl}/send-message`, this.pushSubscription(), {
      headers: {
        'content-type': 'application/json',
      },
    }).subscribe({
      error: (err: Error) => {
        this.errorMessage.set((err as Error).message);
      },
    });
  }
}
