import { defineWebWorkers } from './pure.js';
import 'node:worker_threads';
import 'vitest/execute';
import 'node:fs';
import 'debug';

defineWebWorkers();
