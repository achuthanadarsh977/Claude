"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var Papa = require("papaparse");
function trainTestSplit(X, y, testSize, randomState) {
    if (testSize === void 0) { testSize = 0.2; }
    var n_samples = X.length;
    var n_test = Math.floor(n_samples * testSize);
    var n_train = n_samples - n_test;
    // Create indices array
    var indices = Array.from({ length: n_samples }, function (_, i) { return i; });
    // Shuffle with seed if provided
    if (randomState !== undefined) {
        indices = seededShuffle(indices, randomState);
    }
    else {
        indices = shuffle(indices);
    }
    // Split indices
    var train_indices = indices.slice(0, n_train);
    var test_indices = indices.slice(n_train);
    // Split data
    var X_train = train_indices.map(function (i) { return X[i]; });
    var X_test = test_indices.map(function (i) { return X[i]; });
    var y_train = train_indices.map(function (i) { return y[i]; });
    var y_test = test_indices.map(function (i) { return y[i]; });
    return { X_train: X_train, X_test: X_test, y_train: y_train, y_test: y_test };
}
// Seeded random shuffle (for reproducibility)
function seededShuffle(array, seed) {
    var _a;
    var arr = __spreadArray([], array, true);
    var random = seededRandom(seed);
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(random() * (i + 1));
        _a = [arr[j], arr[i]], arr[i] = _a[0], arr[j] = _a[1];
    }
    return arr;
}
// Regular shuffle
function shuffle(array) {
    var _a;
    var arr = __spreadArray([], array, true);
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        _a = [arr[j], arr[i]], arr[i] = _a[0], arr[j] = _a[1];
    }
    return arr;
}
// Seeded random number generator
function seededRandom(seed) {
    var state = seed;
    return function () {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}
// ============================================
// Option 2: Using PapaParse (lightweight)
// ============================================
function mainWithPapaParse() {
    return __awaiter(this, void 0, void 0, function () {
        var csvFile, parsed, data, columns, X, y, _a, X_train, X_test, y_train, y_test;
        return __generator(this, function (_b) {
            csvFile = fs.readFileSync('C:\\Users\\SriniAchuthan\\OneDrive\\Desktop\\Machine-Learning-A-Z-Codes-Datasets\\Machine Learning A-Z\\Part 1 - Data Preprocessing\\Section 2 -------------------- Part 1 - Data Preprocessing --------------------\\Python\\Data.csv', 'utf8');
            parsed = Papa.parse(csvFile, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true
            });
            data = parsed.data;
            columns = Object.keys(data[0]);
            X = data.map(function (row) {
                return columns.slice(0, -1).map(function (col) { return row[col]; });
            });
            y = data.map(function (row) { return row[columns[columns.length - 1]]; });
            _a = trainTestSplit(X, y, 0.2, 0), X_train = _a.X_train, X_test = _a.X_test, y_train = _a.y_train, y_test = _a.y_test;
            console.log('X_train shape:', X_train.length, 'x', X_train[0].length);
            console.log('X_test shape:', X_test.length, 'x', X_test[0].length);
            console.log('y_train length:', y_train.length);
            console.log('y_test length:', y_test.length);
            return [2 /*return*/];
        });
    });
}
// ============================================
// Option 3: Manual CSV parsing
// ============================================
function readCSV(filename) {
    var csvContent = fs.readFileSync(filename, 'utf8');
    var lines = csvContent.trim().split('\n');
    // Skip header
    var dataLines = lines.slice(1);
    var data = dataLines.map(function (line) {
        return line.split(',').map(function (val) { return parseFloat(val.trim()); });
    });
    // Extract X and y
    var X = data.map(function (row) { return row.slice(0, -1); });
    var y = data.map(function (row) { return row[row.length - 1]; });
    return { X: X, y: y };
}
// Run the main function
mainWithPapaParse().catch(console.error);
