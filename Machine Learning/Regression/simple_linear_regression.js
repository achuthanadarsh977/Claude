"use strict";
// Simple Linear Regression
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
// Importing the libraries
var fs = require("fs");
var Papa = require("papaparse");
// ============================================
// Simple Linear Regression class
// ============================================
var SimpleLinearRegression = /** @class */ (function () {
    function SimpleLinearRegression() {
        this.slope = null;
        this.intercept = null;
    }
    SimpleLinearRegression.prototype.fit = function (X, y) {
        var n = X.length;
        var xMean = X.reduce(function (a, b) { return a + b; }, 0) / n;
        var yMean = y.reduce(function (a, b) { return a + b; }, 0) / n;
        // slope = Σ(xi - x̄)(yi - ȳ) / Σ(xi - x̄)²
        var numerator = 0;
        var denominator = 0;
        for (var i = 0; i < n; i++) {
            numerator += (X[i] - xMean) * (y[i] - yMean);
            denominator += Math.pow((X[i] - xMean), 2);
        }
        this.slope = numerator / denominator;
        this.intercept = yMean - this.slope * xMean;
    };
    SimpleLinearRegression.prototype.predict = function (X) {
        var _this = this;
        return X.map(function (x) { return _this.intercept + _this.slope * x; });
    };
    return SimpleLinearRegression;
}());
function trainTestSplit(X, y, testSize, randomState) {
    var _a;
    if (testSize === void 0) { testSize = 0.2; }
    var n_samples = X.length;
    var n_test = Math.floor(n_samples * testSize);
    var n_train = n_samples - n_test;
    var indices = Array.from({ length: n_samples }, function (_, i) { return i; });
    if (randomState !== undefined) {
        indices = seededShuffle(indices, randomState);
    }
    else {
        for (var i = indices.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            _a = [indices[j], indices[i]], indices[i] = _a[0], indices[j] = _a[1];
        }
    }
    var train_indices = indices.slice(0, n_train);
    var test_indices = indices.slice(n_train);
    return {
        X_train: train_indices.map(function (i) { return X[i]; }),
        X_test: test_indices.map(function (i) { return X[i]; }),
        y_train: train_indices.map(function (i) { return y[i]; }),
        y_test: test_indices.map(function (i) { return y[i]; }),
    };
}
function seededShuffle(array, seed) {
    var _a;
    var arr = __spreadArray([], array, true);
    var state = seed;
    var random = function () {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(random() * (i + 1));
        _a = [arr[j], arr[i]], arr[i] = _a[0], arr[j] = _a[1];
    }
    return arr;
}
// ============================================
// Main
// ============================================
function main() {
    // Importing the dataset
    var csvFile = fs.readFileSync('C:\\Users\\SriniAchuthan\\OneDrive\\Desktop\\Machine-Learning-A-Z-Codes-Datasets\\Machine Learning A-Z\\Part 2 - Regression\\Section 4 - Simple Linear Regression\\Python\\Salary_Data.csv', 'utf8');
    var parsed = Papa.parse(csvFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });
    var dataset = parsed.data;
    var columns = Object.keys(dataset[0]);
    // X = all columns except last (2D array), y = last column (1D array)
    var X = dataset.map(function (row) {
        return columns.slice(0, -1).map(function (col) { return row[col]; });
    });
    var y = dataset.map(function (row) { return row[columns[columns.length - 1]]; });
    // Splitting the dataset into the Training set and Test set
    var _a = trainTestSplit(X, y, 1 / 3, 0), X_train = _a.X_train, X_test = _a.X_test, y_train = _a.y_train, y_test = _a.y_test;
    // Training the Simple Linear Regression model on the Training set
    var regressor = new SimpleLinearRegression();
    regressor.fit(X_train.map(function (row) { return row[0]; }), y_train);
    // Predicting the Test set results
    var y_pred = regressor.predict(X_test.map(function (row) { return row[0]; }));
    // Output results
    console.log('=== Simple Linear Regression ===\n');
    console.log("Coefficient (slope): ".concat(regressor.slope.toFixed(4)));
    console.log("Intercept: ".concat(regressor.intercept.toFixed(4), "\n"));
    console.log('--- Training set ---');
    console.log("X_train size: ".concat(X_train.length));
    console.log("y_train size: ".concat(y_train.length, "\n"));
    console.log('--- Test set results ---');
    console.log("X_test size: ".concat(X_test.length));
    console.log("y_test size: ".concat(y_test.length, "\n"));
    console.log('Predictions vs Actual:');
    console.log('Years Exp | Predicted Salary | Actual Salary');
    console.log('-'.repeat(50));
    for (var i = 0; i < X_test.length; i++) {
        console.log("".concat(X_test[i][0].toFixed(1).padStart(9), " | ") +
            "".concat(y_pred[i].toFixed(2).padStart(16), " | ") +
            "".concat(y_test[i].toFixed(2).padStart(13)));
    }
}
main();
