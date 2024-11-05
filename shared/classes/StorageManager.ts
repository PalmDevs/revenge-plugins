import type { Paths, PlusOne, PreviousNumbers, ValueOfPath } from 'shared:types'

export default class StorageManager<
    CurrentStorage extends _Storage,
    StorageHistory extends Record<PreviousNumbers<CurrentStorage['version']>, GenericStorage>,
> {
    /**
     * The actual storage, can be any version of the storage, may need migrations
     */
    private readonly _storage: CurrentStorage
    private readonly _migrations: StorageManagerMigrations<CurrentStorage, CurrentStorage['version'], StorageHistory>
    /**
     * The up-to-date version of the storage
     */
    readonly version: CurrentStorage['version']

    constructor(options: StorageManagerOptions<CurrentStorage, CurrentStorage['version'], StorageHistory>) {
        // @ts-expect-error: This will eventually be the right type
        this._storage = options.storage
        this.version = options.version
        this._migrations = options.migrations

        if (!this._storage.version) {
            const newStorage = options.initialize()
            for (const key in newStorage) this._storage[key] = newStorage[key]
        }

        if (this.version < this._storage.version)
            throw new Error('The supported version is lower than the current storage version')
        if (this.version > this._storage.version) this.migrate()
    }

    migrate() {
        let migrationStorage: CurrentStorage = this._storage

        for (let currentVersion = migrationStorage.version; currentVersion < this.version; currentVersion++) {
            // @ts-expect-error: Don't fix migration: any here, it is useless and will slow TypeScript down even more
            const migration = this._migrations[currentVersion] as (oldStorage: GenericStorage) => CurrentStorage
            migrationStorage = migration(migrationStorage)
            migrationStorage.version = currentVersion + 1
        }

        for (const key in migrationStorage) this._storage[key] = migrationStorage[key]
    }

    set<K extends Paths<CurrentStorage>>(path: K, value: ValueOfPath<CurrentStorage, K>) {
        let currentNode: GenericStorage = this._storage

        const steps = path.split('.')
        for (let i = 0; i < steps.length; i++) {
            const nextKey = steps[i]

            if (i === steps.length - 1) {
                // @ts-expect-error: This is too hard to fix
                currentNode[nextKey] = value
            } else {
                // @ts-expect-error: This is too hard to fix
                if (nextKey in currentNode) currentNode = currentNode[nextKey]
                else {
                    const node = {}
                    currentNode[nextKey] = node
                    currentNode = node
                }
            }
        }

        return this
    }

    get<K extends Paths<CurrentStorage>>(path: K): ValueOfPath<CurrentStorage, K> {
        let currentNode: Serializable

        for (const nextKey of path.split('.')) {
            const node = currentNode ?? this._storage
            if (nextKey in (node as SerializableObject)) currentNode = node[nextKey as keyof typeof node]
            else return undefined!
        }

        return currentNode as ValueOfPath<CurrentStorage, K>
    }

    getFirstDefined<Ks extends [Paths<CurrentStorage>, ...Paths<CurrentStorage>[]]>(
        ...paths: Ks
    ): ValueOfPath<CurrentStorage, Ks[number]> | undefined {
        for (const path of paths) {
            const value = this.get(path)
            if (value !== undefined) return value
        }
    }

    setIfNotDefined<K extends Paths<CurrentStorage>>(path: K, valueCb: () => ValueOfPath<CurrentStorage, K>) {
        if (this.get(path) === undefined) this.set(path, valueCb())
        return this
    }

    unset<K extends Paths<CurrentStorage>>(path: K) {
        let currentNode: Serializable

        const steps = path.split('.')
        for (let i = 0; i < steps.length; i++) {
            const nextKey = steps[i]

            if (i === steps.length - 1) {
                delete currentNode![nextKey as keyof typeof currentNode]
                return true
            }

            const node = currentNode ?? this._storage
            if (nextKey in (node as SerializableObject)) currentNode = node[nextKey as keyof typeof node]
            else return false
        }
    }
}

export type StorageManagerOptions<
    CurrentStorage extends _Storage,
    CurrentVersion extends number,
    StorageHistory extends Record<PreviousNumbers<CurrentVersion>, GenericStorage>,
> = {
    // Remember, the storage given can be ANY VERSION of the storage
    storage: _Storage<StorageHistory[keyof StorageHistory]> | CurrentStorage
    initialize: () => CurrentStorage
    // ... while this is the latest version of the storage
    version: CurrentVersion
    migrations: StorageManagerMigrations<CurrentStorage, CurrentVersion, StorageHistory>
}

export type Storage<T extends GenericStorage, V extends number> = _Storage<T, V>

type _Storage<T = GenericStorage, V = number> = T & {
    version: V
}

type GenericStorage = Record<string, Serializable>
type SerializableValue = string | number | boolean | null | undefined

interface SerializableObject {
    [K: string]: Serializable
}

export type Serializable = SerializableValue | SerializableObject | Array<SerializableValue | SerializableObject>

type StorageManagerMigrations<
    T,
    V extends number,
    H extends Record<PreviousNumbers<V>, GenericStorage>,
    FH = H & { [K in V]: T },
> = Omit<
    {
        [CV in PreviousNumbers<V>]: (
            oldStorage: H[CV],
        ) => PlusOne<CV> extends keyof FH ? Omit<FH[PlusOne<CV>], 'version'> : never
    },
    V
>
