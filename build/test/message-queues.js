"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const events_1 = require("events");
const grpc_1 = require("grpc");
const proxyquire = require("proxyquire");
const sinon = require("sinon");
const uuid = require("uuid");
class FakeClient {
    acknowledge(reqOpts, callOptions) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    modifyAckDeadline(reqOpts, callOptions) {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
class FakeSubscriber extends events_1.EventEmitter {
    constructor() {
        super();
        this.name = uuid.v4();
        this.client = new FakeClient();
    }
    getClient() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.client;
        });
    }
}
class FakeMessage {
    constructor() {
        this.ackId = uuid.v4();
    }
}
describe('MessageQueues', () => {
    const sandbox = sinon.createSandbox();
    let subscriber;
    // tslint:disable-next-line variable-name
    let MessageQueue;
    // tslint:disable-next-line variable-name
    let AckQueue;
    // tslint:disable-next-line variable-name
    let ModAckQueue;
    before(() => {
        const queues = proxyquire('../src/message-queues.js', {});
        AckQueue = queues.AckQueue;
        ModAckQueue = queues.ModAckQueue;
        MessageQueue = class MessageQueue extends queues.MessageQueue {
            constructor() {
                super(...arguments);
                this.batches = [];
            }
            _sendBatch(batch) {
                return __awaiter(this, void 0, void 0, function* () {
                    this.batches.push(batch);
                });
            }
        };
    });
    beforeEach(() => {
        subscriber = new FakeSubscriber();
    });
    afterEach(() => sandbox.restore());
    describe('MessageQueue', () => {
        let messageQueue;
        beforeEach(() => {
            messageQueue = new MessageQueue(subscriber);
        });
        describe('initialization', () => {
            it('should default numPendingRequests', () => {
                assert.strictEqual(messageQueue.numPendingRequests, 0);
            });
            it('should set any provided options', () => {
                const fakeOptions = {};
                const stub = sandbox.stub(MessageQueue.prototype, 'setOptions');
                const mq = new MessageQueue(subscriber, fakeOptions);
                const [options] = stub.lastCall.args;
                assert.strictEqual(options, fakeOptions);
            });
        });
        describe('maxMilliseconds', () => {
            it('should return the maxMilliseconds option', () => {
                const maxMilliseconds = 101;
                messageQueue.setOptions({ maxMilliseconds });
                assert.strictEqual(messageQueue.maxMilliseconds, maxMilliseconds);
            });
        });
        describe('add', () => {
            it('should increase the number of pending requests', () => {
                messageQueue.add(new FakeMessage());
                assert.strictEqual(messageQueue.numPendingRequests, 1);
            });
            it('should flush the queue if at capacity', () => {
                const stub = sandbox.stub(messageQueue, 'flush');
                messageQueue.setOptions({ maxMessages: 1 });
                messageQueue.add(new FakeMessage());
                assert.strictEqual(stub.callCount, 1);
            });
            it('should schedule a flush if needed', () => {
                const clock = sandbox.useFakeTimers();
                const stub = sandbox.stub(messageQueue, 'flush');
                const delay = 1000;
                messageQueue.setOptions({ maxMilliseconds: delay });
                messageQueue.add(new FakeMessage());
                assert.strictEqual(stub.callCount, 0);
                clock.tick(delay);
                assert.strictEqual(stub.callCount, 1);
            });
        });
        describe('flush', () => {
            it('should cancel scheduled flushes', () => {
                const clock = sandbox.useFakeTimers();
                const spy = sandbox.spy(messageQueue, 'flush');
                const delay = 1000;
                messageQueue.setOptions({ maxMilliseconds: delay });
                messageQueue.add(new FakeMessage());
                messageQueue.flush();
                clock.tick(delay);
                assert.strictEqual(spy.callCount, 1);
            });
            it('should remove the messages from the queue', () => {
                messageQueue.add(new FakeMessage());
                messageQueue.flush();
                assert.strictEqual(messageQueue.numPendingRequests, 0);
            });
            it('should send the batch', () => {
                const message = new FakeMessage();
                const deadline = 10;
                messageQueue.add(message, deadline);
                messageQueue.flush();
                const expectedBatch = [[message.ackId, deadline]];
                const [batch] = messageQueue.batches;
                assert.deepStrictEqual(batch, expectedBatch);
            });
            it('should emit any errors', done => {
                const fakeError = new Error('err');
                sandbox.stub(messageQueue.batches, 'push').throws(fakeError);
                subscriber.on('error', err => {
                    assert.strictEqual(err, fakeError);
                    done();
                });
                messageQueue.flush();
            });
            it('should resolve any pending promises', () => {
                const promise = messageQueue.onFlush();
                setImmediate(() => messageQueue.flush());
                return promise;
            });
        });
        describe('onFlush', () => {
            it('should create a promise', () => {
                const promise = messageQueue.onFlush();
                assert(promise instanceof Promise);
            });
            it('should re-use existing promises', () => {
                const promise1 = messageQueue.onFlush();
                const promise2 = messageQueue.onFlush();
                assert.strictEqual(promise1, promise2);
            });
        });
        describe('setOptions', () => {
            it('should default maxMessages to 3000', () => {
                const stub = sandbox.stub(messageQueue, 'flush');
                for (let i = 0; i < 3000; i++) {
                    assert.strictEqual(stub.callCount, 0);
                    messageQueue.add(new FakeMessage());
                }
                assert.strictEqual(stub.callCount, 1);
            });
            it('should respect user supplied maxMessages', () => {
                const stub = sandbox.stub(messageQueue, 'flush');
                const maxMessages = 100;
                messageQueue.setOptions({ maxMessages });
                for (let i = 0; i < maxMessages; i++) {
                    assert.strictEqual(stub.callCount, 0);
                    messageQueue.add(new FakeMessage());
                }
                assert.strictEqual(stub.callCount, 1);
            });
            it('should default maxMilliseconds to 100', () => {
                const clock = sandbox.useFakeTimers();
                const stub = sandbox.stub(messageQueue, 'flush');
                messageQueue.add(new FakeMessage());
                clock.tick(100);
                assert.strictEqual(stub.callCount, 1);
            });
            it('should respect user supplied maxMilliseconds', () => {
                const clock = sandbox.useFakeTimers();
                const stub = sandbox.stub(messageQueue, 'flush');
                const maxMilliseconds = 10000;
                messageQueue.setOptions({ maxMilliseconds });
                messageQueue.add(new FakeMessage());
                clock.tick(maxMilliseconds);
                assert.strictEqual(stub.callCount, 1);
            });
        });
    });
    describe('AckQueue', () => {
        let ackQueue;
        beforeEach(() => {
            ackQueue = new AckQueue(subscriber);
        });
        it('should send batches via Client#acknowledge', () => __awaiter(this, void 0, void 0, function* () {
            const messages = [
                new FakeMessage(),
                new FakeMessage(),
                new FakeMessage(),
            ];
            const stub = sandbox.stub(subscriber.client, 'acknowledge').resolves();
            const expectedReqOpts = {
                subscription: subscriber.name,
                ackIds: messages.map(({ ackId }) => ackId),
            };
            messages.forEach(message => ackQueue.add(message));
            yield ackQueue.flush();
            const [reqOpts] = stub.lastCall.args;
            assert.deepStrictEqual(reqOpts, expectedReqOpts);
        }));
        it('should send call options', () => __awaiter(this, void 0, void 0, function* () {
            const fakeCallOptions = { timeout: 10000 };
            const stub = sandbox.stub(subscriber.client, 'acknowledge').resolves();
            ackQueue.setOptions({ callOptions: fakeCallOptions });
            yield ackQueue.flush();
            const [, callOptions] = stub.lastCall.args;
            assert.strictEqual(callOptions, fakeCallOptions);
        }));
        it('should throw a BatchError if unable to ack', done => {
            const messages = [
                new FakeMessage(),
                new FakeMessage(),
                new FakeMessage(),
            ];
            const ackIds = messages.map(message => message.ackId);
            const fakeError = new Error('Err.');
            fakeError.code = 2;
            fakeError.metadata = new grpc_1.Metadata();
            const expectedMessage = `Failed to "acknowledge" for 3 message(s). Reason: Err.`;
            sandbox.stub(subscriber.client, 'acknowledge').rejects(fakeError);
            subscriber.on('error', (err) => {
                assert.strictEqual(err.message, expectedMessage);
                assert.deepStrictEqual(err.ackIds, ackIds);
                assert.strictEqual(err.code, fakeError.code);
                assert.strictEqual(err.metadata, fakeError.metadata);
                done();
            });
            messages.forEach(message => ackQueue.add(message));
            ackQueue.flush();
        });
    });
    describe('ModAckQueue', () => {
        let modAckQueue;
        beforeEach(() => {
            modAckQueue = new ModAckQueue(subscriber);
        });
        it('should send batches via Client#modifyAckDeadline', () => __awaiter(this, void 0, void 0, function* () {
            const deadline = 600;
            const messages = [
                new FakeMessage(),
                new FakeMessage(),
                new FakeMessage(),
            ];
            const stub = sandbox.stub(subscriber.client, 'modifyAckDeadline').resolves();
            const expectedReqOpts = {
                subscription: subscriber.name,
                ackDeadlineSeconds: deadline,
                ackIds: messages.map(({ ackId }) => ackId),
            };
            messages.forEach(message => modAckQueue.add(message, deadline));
            yield modAckQueue.flush();
            const [reqOpts] = stub.lastCall.args;
            assert.deepStrictEqual(reqOpts, expectedReqOpts);
        }));
        it('should group ackIds by deadline', () => __awaiter(this, void 0, void 0, function* () {
            const deadline1 = 600;
            const deadline2 = 1000;
            const messages1 = [new FakeMessage(), new FakeMessage(), new FakeMessage()];
            const messages2 = [new FakeMessage(), new FakeMessage(), new FakeMessage()];
            const stub = sandbox.stub(subscriber.client, 'modifyAckDeadline').resolves();
            const expectedReqOpts1 = {
                subscription: subscriber.name,
                ackDeadlineSeconds: deadline1,
                ackIds: messages1.map(({ ackId }) => ackId),
            };
            const expectedReqOpts2 = {
                subscription: subscriber.name,
                ackDeadlineSeconds: deadline2,
                ackIds: messages2.map(({ ackId }) => ackId),
            };
            messages1.forEach(message => modAckQueue.add(message, deadline1));
            messages2.forEach(message => modAckQueue.add(message, deadline2));
            yield modAckQueue.flush();
            const [reqOpts1] = stub.getCall(0).args;
            assert.deepStrictEqual(reqOpts1, expectedReqOpts1);
            const [reqOpts2] = stub.getCall(1).args;
            assert.deepStrictEqual(reqOpts2, expectedReqOpts2);
        }));
        it('should send call options', () => __awaiter(this, void 0, void 0, function* () {
            const fakeCallOptions = { timeout: 10000 };
            const stub = sandbox.stub(subscriber.client, 'modifyAckDeadline').resolves();
            modAckQueue.setOptions({ callOptions: fakeCallOptions });
            modAckQueue.add(new FakeMessage(), 10);
            yield modAckQueue.flush();
            const [, callOptions] = stub.lastCall.args;
            assert.strictEqual(callOptions, fakeCallOptions);
        }));
        it('should throw a BatchError if unable to modAck', done => {
            const messages = [
                new FakeMessage(),
                new FakeMessage(),
                new FakeMessage(),
            ];
            const ackIds = messages.map(message => message.ackId);
            const fakeError = new Error('Err.');
            fakeError.code = 2;
            fakeError.metadata = new grpc_1.Metadata();
            const expectedMessage = `Failed to "modifyAckDeadline" for 3 message(s). Reason: Err.`;
            sandbox.stub(subscriber.client, 'modifyAckDeadline').rejects(fakeError);
            subscriber.on('error', (err) => {
                assert.strictEqual(err.message, expectedMessage);
                assert.deepStrictEqual(err.ackIds, ackIds);
                assert.strictEqual(err.code, fakeError.code);
                assert.strictEqual(err.metadata, fakeError.metadata);
                done();
            });
            messages.forEach(message => modAckQueue.add(message));
            modAckQueue.flush();
        });
    });
});
//# sourceMappingURL=message-queues.js.map