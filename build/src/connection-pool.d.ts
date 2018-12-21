/*!
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/// <reference types="node" />
import { EventEmitter } from 'events';
import { Subscription } from './subscription';
import { PubSub } from '.';
import { Duplex } from 'stream';
import { StatusObject } from 'grpc';
import { Subscriber } from './subscriber';
export interface ConnectionPoolSettings {
    maxConnections: number;
    ackDeadline: number;
}
export declare type ConnectionResponse = [Duplex];
export interface ConnectionCallback {
    (err: Error | null, connection?: Duplex): void;
}
/*!
 * ConnectionPool is used to manage the stream connections created via
 * StreamingPull rpc.
 *
 * @private
 * @param {Subscription} subscription The subscription to create
 *     connections for.
 * @param {object} [options] Pool options.
 * @param {number} [options.maxConnections=5] Number of connections to create.
 * @param {number} [options.ackDeadline] The ack deadline to send when
 *     creating a connection.
 */
export declare class ConnectionPool extends EventEmitter {
    subscription: Subscription;
    pubsub: PubSub;
    connections: Map<string, Duplex>;
    isPaused: boolean;
    isOpen: boolean;
    isGettingChannelState: boolean;
    failedConnectionAttempts: number;
    noConnectionsTime: number;
    settings: ConnectionPoolSettings;
    queue: NodeJS.Timer[];
    keepAliveHandle?: NodeJS.Timer;
    client?: Subscriber | null;
    constructor(subscription: Subscription);
    /*!
     * Acquires a connection from the pool. Optionally you can specify an id for a
     * specific connection, but if it is no longer available it will return the
     * first available connection.
     *
     * @private
     * @param {string} [id] The id of the connection to retrieve.
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error returned while acquiring a
     *     connection.
     * @param {stream} callback.connection A duplex stream.
     */
    acquire(id?: string): Promise<ConnectionResponse>;
    acquire(id: string, callback: ConnectionCallback): void;
    acquire(callback: ConnectionCallback): void;
    /*!
     * Ends each connection in the pool and closes the pool, preventing new
     * connections from being created.
     *
     * @private
     * @param {function} callback The callback function.
     * @param {?error} callback.error An error returned while closing the pool.
     */
    close(callback: any): void;
    /*!
     * Creates a connection. This is async but instead of providing a callback
     * a `connected` event will fire once the connection is ready.
     *
     * @private
     */
    createConnection(): void;
    /**
     * Creates a message object for the user.
     *
     * @param {string} connectionId The connection id that the message was
     *     received on.
     * @param {object} resp The message response data from StreamingPull.
     * @return {object} message The message object.
     */
    createMessage(connectionId: any, resp: any): {
        connectionId: any;
        ackId: any;
        id: any;
        attributes: any;
        publishTime: Date;
        received: number;
        data: any;
        readonly length: any;
        ack: () => void;
        nack: (delay?: number | undefined) => void;
    };
    /*!
     * Gets the channels connectivity state and emits channel events accordingly.
     *
     * @private
     * @fires CHANNEL_ERROR_EVENT
     * @fires CHANNEL_READY_EVENT
     */
    getAndEmitChannelState(): void;
    /*!
     * Gets the Subscriber client. We need to bypass GAX until they allow
     * deadlines to be optional.
     *
     * @private
     * @param {function} callback The callback function.
     * @param {?error} callback.err An error occurred while getting the client.
     * @param {object} callback.client The Subscriber client.
     */
    getClient(callback: any): void;
    /*!
     * Check to see if at least one stream in the pool is connected.
     *
     * @private
     * @returns {boolean}
     */
    isConnected(): boolean;
    /*!
     * Creates specified number of connections and puts pool in open state.
     *
     * @private
     */
    open(): void;
    /*!
     * Pauses each of the connections, causing `message` events to stop firing.
     *
     * @private
     */
    pause(): void;
    /*!
     * Queues a connection to be created. If any previous connections have failed,
     * it will apply a back off based on the number of failures.
     *
     * @private
     */
    queueConnection(): void;
    /*!
     * Calls resume on each connection, allowing `message` events to fire off
     * again.
     *
     * @private
     */
    resume(): void;
    /*!
     * Sends empty message in an effort to keep the stream alive.
     *
     * @private
     */
    sendKeepAlives(): void;
    /*!
     * Inspects a status object to determine whether or not we should try and
     * reconnect.
     *
     * @private
     * @param {object} status The gRPC status object.
     * @return {boolean}
     */
    shouldReconnect(status: StatusObject): boolean;
}
