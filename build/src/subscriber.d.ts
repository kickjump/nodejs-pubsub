/*!
 * Copyright 2018 Google Inc. All Rights Reserved.
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
import { ClientStub } from 'google-gax';
import { common as protobuf } from 'protobufjs';
import { FlowControlOptions } from './lease-manager';
import { BatchOptions } from './message-queues';
import { MessageStreamOptions } from './message-stream';
import { Subscription } from './subscription';
/**
 * @see https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions/pull#ReceivedMessage
 */
interface ReceivedMessage {
    ackId: string;
    message: {
        attributes: {};
        data: Buffer;
        messageId: string;
        publishTime: protobuf.ITimestamp;
    };
}
/**
 * @see https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions/pull#body.PullResponse
 */
export interface PullResponse {
    receivedMessages: ReceivedMessage[];
}
/**
 * Message objects provide a simple interface for users to get message data and
 * acknowledge the message.
 *
 * @private
 * @class
 *
 * @param {Subscriber} sub The parent subscriber.
 * @param {object} message The raw message response.
 */
export declare class Message {
    ackId: string;
    attributes: {};
    data: Buffer;
    id: string;
    publishTime: Date;
    received: number;
    private _handled;
    private _length;
    private _subscriber;
    constructor(sub: Subscriber, { ackId, message }: ReceivedMessage);
    /**
     * The length of the message data.
     *
     * @type {number}
     * @private
     */
    readonly length: number;
    /**
     * Acknowledges the message.
     * @private
     */
    ack(): void;
    /**
     * Modifies the ack deadline.
     *
     * @param {number} deadline The number of seconds to extend the deadline.
     * @private
     */
    modAck(deadline: number): void;
    /**
     * Removes the message from our inventory and schedules it to be redelivered.
     * If the delay parameter is unset, it will be redelivered immediately.
     *
     * @param {number} [delay=0] The desired time to wait before the
     *     redelivery occurs.
     * @private
     */
    nack(delay?: number): void;
    /**
     * Formats the protobuf timestamp into a JavaScript date.
     *
     * @private
     *
     * @param {object} timestamp The protobuf timestamp.
     * @return {date}
     */
    static formatTimestamp({ nanos, seconds }: protobuf.ITimestamp): Date;
}
/**
 * @typedef {object} SubscriberOptions
 * @property {number} [ackDeadline=10] Acknowledge deadline in seconds. If left
 *     unset the initial value will be 10 seconds, but it will evolve into the
 *     99th percentile time it takes to acknowledge a message.
 * @property {BatchingOptions} [batching] Request batching options.
 * @property {FlowControlOptions} [flowControl] Flow control options.
 * @property {MessageStreamOptions} [streamingOptions] Streaming options.
 */
export interface SubscriberOptions {
    ackDeadline?: number;
    batching?: BatchOptions;
    flowControl?: FlowControlOptions;
    streamingOptions?: MessageStreamOptions;
}
/**
 * Subscriber class is used to manage all message related functionality.
 *
 * @private
 * @class
 *
 * @param {Subscription} subscription The corresponding subscription.
 * @param {SubscriberOptions} options The subscriber options.
 */
export declare class Subscriber extends EventEmitter {
    ackDeadline: number;
    isOpen: boolean;
    private _acks;
    private _histogram;
    private _inventory;
    private _isUserSetDeadline;
    private _latencies;
    private _modAcks;
    private _name;
    private _options;
    private _stream;
    private _subscription;
    constructor(subscription: Subscription, options?: {});
    /**
     * The 99th percentile of request latencies.
     *
     * @type {number}
     * @private
     */
    readonly modAckLatency: number;
    /**
     * The full name of the Subscription.
     *
     * @type {string}
     * @private
     */
    readonly name: string;
    /**
     * Acknowledges the supplied message.
     *
     * @param {Message} message The message to acknowledge.
     * @returns {Promise}
     * @private
     */
    ack(message: Message): Promise<void>;
    /**
     * Closes the subscriber. The returned promise will resolve once any pending
     * acks/modAcks are finished.
     *
     * @returns {Promise}
     * @private
     */
    close(): Promise<void>;
    /**
     * Gets the subscriber client instance.
     *
     * @returns {Promise<object>}
     * @private
     */
    getClient(): Promise<ClientStub>;
    /**
     * Modifies the acknowledge deadline for the provided message.
     *
     * @param {Message} message The message to modify.
     * @param {number} deadline The deadline.
     * @returns {Promise}
     * @private
     */
    modAck(message: Message, deadline: number): Promise<void>;
    /**
     * Modfies the acknowledge deadline for the provided message and then removes
     * it from our inventory.
     *
     * @param {Message} message The message.
     * @param {number} [delay=0] Delay to wait before redelivery.
     * @return {Promise}
     * @private
     */
    nack(message: Message, delay?: number): Promise<void>;
    /**
     * Starts pulling messages.
     * @private
     */
    open(): void;
    /**
     * Sets subscriber options.
     *
     * @param {SubscriberOptions} options The options.
     * @private
     */
    setOptions(options: SubscriberOptions): void;
    /**
     * Callback to be invoked when a new message is available.
     *
     * New messages will be added to the subscribers inventory, which in turn will
     * automatically extend the messages ack deadline until either:
     *   a. the user acks/nacks it
     *   b. the maxExtension option is hit
     *
     * If the message puts us at/over capacity, then we'll pause our message
     * stream until we've freed up some inventory space.
     *
     * New messages must immediately issue a ModifyAckDeadline request
     * (aka receipt) to confirm with the backend that we did infact receive the
     * message and its ok to start ticking down on the deadline.
     *
     * @private
     */
    private _onData;
    /**
     * Returns a promise that will resolve once all pending requests have settled.
     *
     * @private
     *
     * @returns {Promise}
     */
    private _waitForFlush;
}
export {};
