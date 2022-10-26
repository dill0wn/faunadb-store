import { Cookie, SessionData, Store } from 'express-session';
import { Client, ClientConfig, query as q, FaunaHttpErrorResponseContent } from "faunadb";
import { assert } from 'console';

export interface FaunaSessionData extends SessionData {

}

export interface FaunaStoreOptions extends ClientConfig {
    collection: string;
    index: string;
}

export const defaultOptions: FaunaStoreOptions = Object.freeze({
    collection: 'express-session',
    index: 'express-session-by-session-id',
    secret: '',
})

export default class FaunaStore extends Store {
    
    constructor(
        private config: FaunaStoreOptions,
        private fauna: Client = new Client(config),
    ) {
        super();

        this.config = {
            ...defaultOptions,
            ...config,
        }

        assert(config.secret !== null && config.secret !== '' && config.secret, `FaunaDB Secret must be set`);
    }
    
    static async create(config: FaunaStoreOptions): Promise<FaunaStore> {
        // throw new Error('Method not implemented.');
        // create collection, index, etc.

        const store = new FaunaStore(config);

        const name = store.config.collection;
        
        // TODO: check if Collection or Index are already created.
        const collection = await store.fauna.query(q.Collection(name))

        if(!collection) {
            await store.fauna.query(
                q.Do(
                    q.CreateCollection({ name: name }),
                    q.CreateIndex({
                        name: store.config.index,
                        source: q.Collection(name),
                        terms: [
                            { field: ['data', 'sid'] },
                        ]
                    })
                )
            )
        }
        
        return store;
    }

    get(sid: string, callback: (err: any, session?: any) => void): void {
        const indexName = this.config.index;
        this.fauna.query(
            q.Get(
                q.Match(
                    q.Index(indexName),
                    sid,
                )
            )
        )
        .then((ret) => {
            callback(null, ret);
        })
        .catch((err: FaunaHttpErrorResponseContent) => {
            const error = err.errors.map(e => e.description).join();
            callback(error, null);
        })
    }

    set(sid: string, session: SessionData, callback?: ((err?: any) => void) | undefined): void {
        throw new Error('Method not implemented.');
    }

    destroy(sid: string, callback?: ((err?: any) => void) | undefined): void {
        throw new Error('Method not implemented.');
    }
}