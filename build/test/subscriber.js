"use strict";
/*!
 * Copyright 2019 Google Inc. All Rights Reserved.
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
const proxyquire = require("proxyquire");
const sinon = require("sinon");
const stream_1 = require("stream");
const uuid = require("uuid");
const stubs = new Map();
class FakeClient {
}
class FakePubSub {
    constructor() {
        this.client = new FakeClient();
    }
    getClient_(options, callback) {
        callback(null, this.client);
    }
}
class FakeSubscription {
    constructor() {
        this.name = uuid.v4();
        this.projectId = uuid.v4();
        this.pubsub = new FakePubSub();
    }
}
class FakeHistogram {
    constructor(options) {
        this.options = options;
        const key = options ? 'histogram' : 'latencies';
        stubs.set(key, this);
    }
    add(seconds) { }
    percentile(percentile) {
        return 10;
    }
}
class FakeLeaseManager extends events_1.EventEmitter {
    constructor(sub, options) {
        super();
        this.options = options;
        stubs.set('inventory', this);
    }
    add(message) { }
    clear() { }
    remove(message) { }
}
class FakeQueue {
    constructor(sub, options) {
        this.numPendingRequests = 0;
        this.maxMilliseconds = 100;
        this.options = options;
    }
    add(message, deadline) { }
    flush() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
    onFlush() {
        return __awaiter(this, void 0, void 0, function* () { });
    }
}
class FakeAckQueue extends FakeQueue {
    constructor(sub, options) {
        super(sub, options);
        stubs.set('ackQueue', this);
    }
}
class FakeModAckQueue extends FakeQueue {
    constructor(sub, options) {
        super(sub, options);
        stubs.set('modAckQueue', this);
    }
}
class FakeMessageStream extends stream_1.PassThrough {
    constructor(sub, options) {
        super({ objectMode: true });
        this.options = options;
        stubs.set('messageStream', this);
    }
    destroy(error) { }
}
const RECEIVED_MESSAGE = {
    ackId: uuid.v4(),
    message: {
        attributes: {},
        data: Buffer.from('Hello, world!'),
        messageId: uuid.v4(),
        publishTime: { seconds: 12, nanos: 32 }
    }
};
describe('Subscriber', () => {
    const sandbox = sinon.createSandbox();
    const fakeProjectify = { replaceProjectIdToken: sandbox.stub() };
    let subscription;
    // tslint:disable-next-line variable-name
    let Message;
    let message;
    // tslint:disable-next-line variable-name
    let Subscriber;
    let subscriber;
    before(() => {
        const s = proxyquire('../src/subscriber.js', {
            '@google-cloud/projectify': fakeProjectify,
            './histogram': { Histogram: FakeHistogram },
            './lease-manager': { LeaseManager: FakeLeaseManager },
            './message-queues': { AckQueue: FakeAckQueue, ModAckQueue: FakeModAckQueue },
            './message-stream': { MessageStream: FakeMessageStream },
        });
        Message = s.Message;
        Subscriber = s.Subscriber;
    });
    beforeEach(() => {
        subscription = new FakeSubscription();
        subscriber = new Subscriber(subscription);
        message = new Message(subscriber, RECEIVED_MESSAGE);
        subscriber.open();
    });
    afterEach(() => {
        sandbox.restore();
        subscriber.close();
    });
    describe('initialization', () => {
        it('should default ackDeadline to 10', () => {
            assert.strictEqual(subscriber.ackDeadline, 10);
        });
        it('should set isOpen to false', () => {
            const s = new Subscriber(subscription);
            assert.strictEqual(s.isOpen, false);
        });
        it('should set any options passed in', () => {
            const stub = sandbox.stub(Subscriber.prototype, 'setOptions');
            const fakeOptions = {};
            const sub = new Subscriber(subscription, fakeOptions);
            const [options] = stub.lastCall.args;
            assert.strictEqual(options, fakeOptions);
        });
    });
    describe('modAckLatency', () => {
        it('should get the 99th percentile latency', () => {
            const latencies = stubs.get('latencies');
            const fakeLatency = 234;
            sandbox.stub(latencies, 'percentile').withArgs(99).returns(fakeLatency);
            const maxMilliseconds = stubs.get('modAckQueue').maxMilliseconds;
            const expectedLatency = fakeLatency * 1000 + maxMilliseconds;
            assert.strictEqual(subscriber.modAckLatency, expectedLatency);
        });
    });
    describe('name', () => {
        it('should replace the project id token', () => {
            const fakeName = 'abcd';
            fakeProjectify.replaceProjectIdToken
                .withArgs(subscription.name, subscription.projectId)
                .returns(fakeName);
            const name = subscriber.name;
            assert.strictEqual(name, fakeName);
        });
        it('should cache the name', () => {
            const fakeName = 'abcd';
            const stub = fakeProjectify.replaceProjectIdToken
                .withArgs(subscription.name, subscription.projectId)
                .returns(fakeName);
            const name = subscriber.name;
            assert.strictEqual(name, fakeName);
            const name2 = subscriber.name;
            assert.strictEqual(name, name2);
            assert.strictEqual(stub.callCount, 1);
        });
    });
    describe('ack', () => {
        it('should update the ack histogram/deadline', () => {
            const histogram = stubs.get('histogram');
            const now = Date.now();
            message.received = 23842328;
            sandbox.stub(global.Date, 'now').returns(now);
            const expectedSeconds = (now - message.received) / 1000;
            const addStub = sandbox.stub(histogram, 'add').withArgs(expectedSeconds);
            const fakeDeadline = 312123;
            sandbox.stub(histogram, 'percentile').withArgs(99).returns(fakeDeadline);
            subscriber.ack(message);
            assert.strictEqual(addStub.callCount, 1);
            assert.strictEqual(subscriber.ackDeadline, fakeDeadline);
        });
        it('should not update the deadline if user specified', () => {
            const histogram = stubs.get('histogram');
            const ackDeadline = 543;
            sandbox.stub(histogram, 'add').throws();
            sandbox.stub(histogram, 'percentile').throws();
            subscriber.setOptions({ ackDeadline });
            subscriber.ack(message);
            assert.strictEqual(subscriber.ackDeadline, ackDeadline);
        });
        it('should add the message to the ack queue', () => {
            const ackQueue = stubs.get('ackQueue');
            const stub = sandbox.stub(ackQueue, 'add').withArgs(message);
            subscriber.ack(message);
            assert.strictEqual(stub.callCount, 1);
        });
        it('should remove the message from inv. after queue flushes', done => {
            const ackQueue = stubs.get('ackQueue');
            const inventory = stubs.get('inventory');
            const onFlushStub = sandbox.stub(ackQueue, 'onFlush').resolves();
            sandbox.stub(inventory, 'remove').withArgs(message).callsFake(() => {
                assert.strictEqual(onFlushStub.callCount, 1);
                done();
            });
            subscriber.ack(message);
        });
    });
    describe('close', () => {
        it('should noop if not open', () => {
            const s = new Subscriber(subscription);
            const stream = stubs.get('messageStream');
            sandbox.stub(stream, 'destroy')
                .rejects(new Error('should not be called.'));
            return s.close();
        });
        it('should set isOpen to false', () => {
            subscriber.close();
            assert.strictEqual(subscriber.isOpen, false);
        });
        it('should destroy the message stream', () => {
            const stream = stubs.get('messageStream');
            const stub = sandbox.stub(stream, 'destroy');
            subscriber.close();
            assert.strictEqual(stub.callCount, 1);
        });
        it('should clear the inventory', () => {
            const inventory = stubs.get('inventory');
            const stub = sandbox.stub(inventory, 'clear');
            subscriber.close();
            assert.strictEqual(stub.callCount, 1);
        });
        it('should emit a close event', done => {
            subscriber.on('close', done);
            subscriber.close();
        });
        describe('flushing the queues', () => {
            it('should wait for any pending acks', () => __awaiter(this, void 0, void 0, function* () {
                const ackQueue = stubs.get('ackQueue');
                const ackOnFlush = sandbox.stub(ackQueue, 'onFlush').resolves();
                const acksFlush = sandbox.stub(ackQueue, 'flush').resolves();
                ackQueue.numPendingRequests = 1;
                yield subscriber.close();
                assert.strictEqual(ackOnFlush.callCount, 1);
                assert.strictEqual(acksFlush.callCount, 1);
            }));
            it('should wait for any pending modAcks', () => __awaiter(this, void 0, void 0, function* () {
                const modAckQueue = stubs.get('modAckQueue');
                const modAckOnFlush = sandbox.stub(modAckQueue, 'onFlush').resolves();
                const modAckFlush = sandbox.stub(modAckQueue, 'flush').resolves();
                modAckQueue.numPendingRequests = 1;
                yield subscriber.close();
                assert.strictEqual(modAckOnFlush.callCount, 1);
                assert.strictEqual(modAckFlush.callCount, 1);
            }));
            it('should resolve if no messages are pending', () => {
                const ackQueue = stubs.get('ackQueue');
                sandbox.stub(ackQueue, 'flush').rejects();
                sandbox.stub(ackQueue, 'onFlush').rejects();
                const modAckQueue = stubs.get('modAckQueue');
                sandbox.stub(modAckQueue, 'flush').rejects();
                sandbox.stub(modAckQueue, 'onFlush').rejects();
                return subscriber.close();
            });
        });
    });
    describe('getClient', () => {
        it('should get a subscriber client', () => __awaiter(this, void 0, void 0, function* () {
            const pubsub = subscription.pubsub;
            const spy = sandbox.spy(pubsub, 'getClient_');
            const client = yield subscriber.getClient();
            const [options] = spy.lastCall.args;
            assert.deepStrictEqual(options, { client: 'SubscriberClient' });
            assert.strictEqual(client, pubsub.client);
        }));
    });
    describe('modAck', () => {
        const deadline = 600;
        it('should add the message/deadline to the modAck queue', () => {
            const modAckQueue = stubs.get('modAckQueue');
            const stub = sandbox.stub(modAckQueue, 'add').withArgs(message, deadline);
            subscriber.modAck(message, deadline);
            assert.strictEqual(stub.callCount, 1);
        });
        it('should capture latency after queue flush', () => __awaiter(this, void 0, void 0, function* () {
            const modAckQueue = stubs.get('modAckQueue');
            const latencies = stubs.get('latencies');
            const start = 1232123;
            const end = 34838243;
            const expectedSeconds = (end - start) / 1000;
            const dateStub = sandbox.stub(global.Date, 'now');
            dateStub.onCall(0).returns(start);
            dateStub.onCall(1).returns(end);
            sandbox.stub(modAckQueue, 'onFlush').resolves();
            const addStub = sandbox.stub(latencies, 'add').withArgs(expectedSeconds);
            yield subscriber.modAck(message, deadline);
            assert.strictEqual(addStub.callCount, 1);
        }));
    });
    describe('nack', () => {
        it('should modAck the message with a 0 deadline', () => __awaiter(this, void 0, void 0, function* () {
            const stub = sandbox.stub(subscriber, 'modAck');
            yield subscriber.nack(message);
            const [msg, deadline] = stub.lastCall.args;
            assert.strictEqual(msg, message);
            assert.strictEqual(deadline, 0);
        }));
        it('should remove the message from the inventory', () => __awaiter(this, void 0, void 0, function* () {
            const inventory = stubs.get('inventory');
            const stub = sandbox.stub(inventory, 'remove').withArgs(message);
            yield subscriber.nack(message);
            assert.strictEqual(stub.callCount, 1);
        }));
    });
    describe('open', () => {
        beforeEach(() => subscriber.close());
        it('should pass in batching options', () => {
            const batching = { maxMessages: 100 };
            subscriber.setOptions({ batching });
            subscriber.open();
            const ackQueue = stubs.get('ackQueue');
            const modAckQueue = stubs.get('modAckQueue');
            assert.strictEqual(ackQueue.options, batching);
            assert.strictEqual(modAckQueue.options, batching);
        });
        it('should pass in flow control options', () => {
            const flowControl = { maxMessages: 100 };
            subscriber.setOptions({ flowControl });
            subscriber.open();
            const inventory = stubs.get('inventory');
            assert.strictEqual(inventory.options, flowControl);
        });
        it('should pass in streaming options', () => {
            const streamingOptions = { maxStreams: 3 };
            subscriber.setOptions({ streamingOptions });
            subscriber.open();
            const stream = stubs.get('messageStream');
            assert.strictEqual(stream.options, streamingOptions);
        });
        it('should emit stream errors', done => {
            subscriber.open();
            const stream = stubs.get('messageStream');
            const fakeError = new Error('err');
            subscriber.on('error', err => {
                assert.strictEqual(err, fakeError);
                done();
            });
            stream.emit('error', fakeError);
        });
        it('should close the subscriber if stream closes unexpectedly', () => {
            const stub = sandbox.stub(subscriber, 'close');
            const stream = stubs.get('messageStream');
            stream.emit('close');
            assert.strictEqual(stub.callCount, 1);
        });
        it('should add messages to the inventory', done => {
            subscriber.open();
            const modAckStub = sandbox.stub(subscriber, 'modAck');
            const stream = stubs.get('messageStream');
            const pullResponse = { receivedMessages: [RECEIVED_MESSAGE] };
            const inventory = stubs.get('inventory');
            const addStub = sandbox.stub(inventory, 'add').callsFake(() => {
                const [addMsg] = addStub.lastCall.args;
                assert.deepStrictEqual(addMsg, message);
                // test for receipt
                const [modAckMsg, deadline] = modAckStub.lastCall.args;
                assert.strictEqual(addMsg, modAckMsg);
                assert.strictEqual(deadline, subscriber.ackDeadline);
                done();
            });
            sandbox.stub(global.Date, 'now').returns(message.received);
            stream.emit('data', pullResponse);
        });
        it('should pause the stream when full', () => {
            const inventory = stubs.get('inventory');
            const stream = stubs.get('messageStream');
            const pauseStub = sandbox.stub(stream, 'pause');
            inventory.emit('full');
            assert.strictEqual(pauseStub.callCount, 1);
        });
        it('should resume the stream when not full', () => {
            const inventory = stubs.get('inventory');
            const stream = stubs.get('messageStream');
            const resumeStub = sandbox.stub(stream, 'resume');
            inventory.emit('free');
            assert.strictEqual(resumeStub.callCount, 1);
        });
        it('should set isOpen to false', () => {
            subscriber.open();
            assert.strictEqual(subscriber.isOpen, true);
        });
    });
    describe('setOptions', () => {
        beforeEach(() => subscriber.close());
        it('should capture the ackDeadline', () => {
            const ackDeadline = 1232;
            subscriber.setOptions({ ackDeadline });
            assert.strictEqual(subscriber.ackDeadline, ackDeadline);
        });
        it('should not set maxStreams higher than maxMessages', () => {
            const maxMessages = 3;
            const flowControl = { maxMessages };
            subscriber.setOptions({ flowControl });
            subscriber.open();
            const stream = stubs.get('messageStream');
            assert.strictEqual(stream.options.maxStreams, maxMessages);
        });
    });
    describe('Message', () => {
        describe('initialization', () => {
            it('should localize ackId', () => {
                assert.strictEqual(message.ackId, RECEIVED_MESSAGE.ackId);
            });
            it('should localize attributes', () => {
                assert.strictEqual(message.attributes, RECEIVED_MESSAGE.message.attributes);
            });
            it('should localize data', () => {
                assert.strictEqual(message.data, RECEIVED_MESSAGE.message.data);
            });
            it('should localize id', () => {
                assert.strictEqual(message.id, RECEIVED_MESSAGE.message.messageId);
            });
            it('should localize publishTime', () => {
                const fakeDate = new Date();
                sandbox.stub(Message, 'formatTimestamp')
                    .withArgs(RECEIVED_MESSAGE.message.publishTime)
                    .returns(fakeDate);
                const m = new Message(subscriber, RECEIVED_MESSAGE);
                assert.strictEqual(m.publishTime, fakeDate);
            });
            it('should localize recieved time', () => {
                const now = Date.now();
                sandbox.stub(global.Date, 'now').returns(now);
                const m = new Message(subscriber, RECEIVED_MESSAGE);
                assert.strictEqual(m.received, now);
            });
        });
        describe('length', () => {
            it('should return the data length', () => {
                assert.strictEqual(message.length, message.data.length);
            });
            it('should preserve the original data lenght', () => {
                const originalLength = message.data.length;
                message.data = Buffer.from('ohno');
                assert.notStrictEqual(message.length, message.data.length);
                assert.strictEqual(message.length, originalLength);
            });
        });
        describe('ack', () => {
            it('should ack the message', () => {
                const stub = sandbox.stub(subscriber, 'ack');
                message.ack();
                const [msg] = stub.lastCall.args;
                assert.strictEqual(msg, message);
            });
            it('should not ack the message if its been handled', () => {
                const stub = sandbox.stub(subscriber, 'ack');
                message.nack();
                message.ack();
                assert.strictEqual(stub.callCount, 0);
            });
        });
        describe('modAck', () => {
            it('should modAck the message', () => {
                const fakeDeadline = 10;
                const stub = sandbox.stub(subscriber, 'modAck');
                message.modAck(fakeDeadline);
                const [msg, deadline] = stub.lastCall.args;
                assert.strictEqual(msg, message);
                assert.strictEqual(deadline, fakeDeadline);
            });
            it('should not modAck the message if its been handled', () => {
                const deadline = 10;
                const stub = sandbox.stub(subscriber, 'modAck');
                message.ack();
                message.modAck(deadline);
                assert.strictEqual(stub.callCount, 0);
            });
        });
        describe('nack', () => {
            it('should nack the message', () => {
                const fakeDelay = 10;
                const stub = sandbox.stub(subscriber, 'modAck');
                message.nack(fakeDelay);
                const [msg, delay] = stub.lastCall.args;
                assert.strictEqual(msg, message);
                assert.strictEqual(delay, fakeDelay);
            });
            it('should not nack the message if its been handled', () => {
                const delay = 10;
                const stub = sandbox.stub(subscriber, 'modAck');
                message.ack();
                message.nack(delay);
                assert.strictEqual(stub.callCount, 0);
            });
        });
        describe('formatTimestamp', () => {
            it('should format the timestamp object', () => {
                const publishTime = RECEIVED_MESSAGE.message.publishTime;
                const actual = Message.formatTimestamp(publishTime);
                const ms = publishTime.nanos / 1e6;
                const s = publishTime.seconds * 1000;
                const expectedDate = new Date(ms + s);
                assert.deepStrictEqual(actual, expectedDate);
            });
        });
    });
});
//# sourceMappingURL=subscriber.js.map