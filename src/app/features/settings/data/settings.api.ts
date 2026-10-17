import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import { delay, of, throwError } from 'rxjs';

import { ApiError } from '@core/http/api-error';

import {
  DEMO_ATTRIBUTIONS,
  DEMO_CONTRACTS,
  DEMO_EXERCISES,
  DEMO_LOTS,
  DEMO_OPERATORS,
  DEMO_SECTORS,
  DEMO_USERS,
} from './settings.demo';
import type {
  Attribution,
  AttributionInput,
  Contract,
  ContractInput,
  Exercise,
  Lot,
  LotInput,
  ExerciseInput,
  Operator,
  OperatorInput,
  Sector,
  SectorInput,
  User,
  UserInput,
} from './settings.models';

/** Opérations communes à toutes les ressources de l'écran Paramètres. */
export interface Crud<T extends { readonly id: string }, I> {
  list(): Observable<readonly T[]>;
  create(input: I): Observable<T>;
  update(id: string, input: I): Observable<T>;
}

/** Contrat d'accès aux données ; deux implémentations interchangeables (démo et HTTP). */
export abstract class SettingsApi {
  abstract readonly operators: Crud<Operator, OperatorInput>;
  abstract readonly contracts: Crud<Contract, ContractInput>;
  abstract readonly attributions: Crud<Attribution, AttributionInput>;
  abstract readonly exercises: Crud<Exercise, ExerciseInput>;
  abstract readonly users: Crud<User, UserInput>;
  abstract readonly sectors: Crud<Sector, SectorInput>;
  abstract readonly lots: Crud<Lot, LotInput>;
}

class HttpCrud<T extends { readonly id: string }, I> implements Crud<T, I> {
  constructor(
    private readonly http: HttpClient,
    private readonly path: string,
  ) {}

  list(): Observable<readonly T[]> {
    return this.http.get<readonly T[]>(this.path);
  }

  create(input: I): Observable<T> {
    return this.http.post<T>(this.path, input);
  }

  update(id: string, input: I): Observable<T> {
    return this.http.put<T>(`${this.path}/${id}`, input);
  }
}

/** Appelle la passerelle Spring Boot : `GET/POST {apiBaseUrl}/operateurs`, `PUT …/operateurs/{id}`, etc. */
@Injectable()
export class HttpSettingsApi extends SettingsApi {
  private readonly http = inject(HttpClient);

  readonly operators = new HttpCrud<Operator, OperatorInput>(this.http, '/operateurs');
  readonly contracts = new HttpCrud<Contract, ContractInput>(this.http, '/contrats');
  readonly attributions = new HttpCrud<Attribution, AttributionInput>(this.http, '/attributions');
  readonly exercises = new HttpCrud<Exercise, ExerciseInput>(this.http, '/exercices');
  readonly users = new HttpCrud<User, UserInput>(this.http, '/utilisateurs');
  readonly sectors = new HttpCrud<Sector, SectorInput>(this.http, '/secteurs');
  readonly lots = new HttpCrud<Lot, LotInput>(this.http, '/lots');
}

const LATENCY_MS = 250;

class MemoryCrud<T extends { readonly id: string }, I> implements Crud<T, I> {
  private items: T[];
  private counter: number;

  constructor(
    seed: readonly T[],
    private readonly prefix: string,
  ) {
    this.items = [...seed];
    this.counter = seed.length;
  }

  list(): Observable<readonly T[]> {
    return of([...this.items]).pipe(delay(LATENCY_MS));
  }

  create(input: I): Observable<T> {
    this.counter += 1;
    const item = { ...input, id: `${this.prefix}-${this.counter}` } as unknown as T;
    this.items.push(item);
    return of(item).pipe(delay(LATENCY_MS));
  }

  update(id: string, input: I): Observable<T> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index < 0) {
      return throwError(() => new ApiError(404, 'La ressource demandée est introuvable.'));
    }
    const item = { ...input, id } as unknown as T;
    this.items[index] = item;
    return of(item).pipe(delay(LATENCY_MS));
  }
}

/** Données en mémoire : les modifications durent le temps de la session de navigation. */
@Injectable()
export class DemoSettingsApi extends SettingsApi {
  readonly operators = new MemoryCrud<Operator, OperatorInput>(DEMO_OPERATORS, 'op');
  readonly contracts = new MemoryCrud<Contract, ContractInput>(DEMO_CONTRACTS, 'ct');
  readonly attributions = new MemoryCrud<Attribution, AttributionInput>(DEMO_ATTRIBUTIONS, 'at');
  readonly exercises = new MemoryCrud<Exercise, ExerciseInput>(DEMO_EXERCISES, 'ex');
  readonly users = new MemoryCrud<User, UserInput>(DEMO_USERS, 'us');
  readonly sectors = new MemoryCrud<Sector, SectorInput>(DEMO_SECTORS, 'sec');
  readonly lots = new MemoryCrud<Lot, LotInput>(DEMO_LOTS, 'lot');
}
