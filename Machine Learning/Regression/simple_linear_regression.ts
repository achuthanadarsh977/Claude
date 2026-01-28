// Simple Linear Regression

// Importing the libraries
import * as fs from 'fs';
import * as Papa from 'papaparse';

// ============================================
// Simple Linear Regression class
// ============================================

class SimpleLinearRegression {
    slope: number | null = null;
    intercept: number | null = null;

    fit(X: number[], y: number[]): void {
        const n = X.length;
        const xMean = X.reduce((a, b) => a + b, 0) / n;
        const yMean = y.reduce((a, b) => a + b, 0) / n;

        // slope = Σ(xi - x̄)(yi - ȳ) / Σ(xi - x̄)²
        let numerator = 0;
        let denominator = 0;
        for (let i = 0; i < n; i++) {
            numerator += (X[i] - xMean) * (y[i] - yMean);
            denominator += (X[i] - xMean) ** 2;
        }

        this.slope = numerator / denominator;
        this.intercept = yMean - this.slope * xMean;
    }

    predict(X: number[]): number[] {
        return X.map(x => this.intercept! + this.slope! * x);
    }
}

// ============================================
// Train-test split
// ============================================

interface TrainTestSplitResult {
    X_train: number[][];
    X_test: number[][];
    y_train: number[];
    y_test: number[];
}

function trainTestSplit(
    X: number[][],
    y: number[],
    testSize: number = 0.2,
    randomState?: number
): TrainTestSplitResult {
    const n_samples = X.length;
    const n_test = Math.floor(n_samples * testSize);
    const n_train = n_samples - n_test;

    let indices = Array.from({ length: n_samples }, (_, i) => i);

    if (randomState !== undefined) {
        indices = seededShuffle(indices, randomState);
    } else {
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
    }

    const train_indices = indices.slice(0, n_train);
    const test_indices = indices.slice(n_train);

    return {
        X_train: train_indices.map(i => X[i]),
        X_test: test_indices.map(i => X[i]),
        y_train: train_indices.map(i => y[i]),
        y_test: test_indices.map(i => y[i]),
    };
}

function seededShuffle<T>(array: T[], seed: number): T[] {
    const arr = [...array];
    let state = seed;
    const random = () => {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ============================================
// Main
// ============================================

function main() {
    // Importing the dataset
    const csvFile = fs.readFileSync('C:\\Users\\SriniAchuthan\\OneDrive\\Desktop\\Machine-Learning-A-Z-Codes-Datasets\\Machine Learning A-Z\\Part 2 - Regression\\Section 4 - Simple Linear Regression\\Python\\Salary_Data.csv', 'utf8');

    const parsed = Papa.parse(csvFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });

    const dataset = parsed.data as any[];
    const columns = Object.keys(dataset[0]);

    // X = all columns except last (2D array), y = last column (1D array)
    const X: number[][] = dataset.map(row =>
        columns.slice(0, -1).map(col => row[col])
    );
    const y: number[] = dataset.map(row => row[columns[columns.length - 1]]);

    // Splitting the dataset into the Training set and Test set
    const { X_train, X_test, y_train, y_test } = trainTestSplit(X, y, 1 / 3, 0);

    // Training the Simple Linear Regression model on the Training set
    const regressor = new SimpleLinearRegression();
    regressor.fit(X_train.map(row => row[0]), y_train);

    // Predicting the Test set results
    const y_pred = regressor.predict(X_test.map(row => row[0]));

    // Output results
    console.log('=== Simple Linear Regression ===\n');
    console.log(`Coefficient (slope): ${regressor.slope!.toFixed(4)}`);
    console.log(`Intercept: ${regressor.intercept!.toFixed(4)}\n`);

    console.log('--- Training set ---');
    console.log(`X_train size: ${X_train.length}`);
    console.log(`y_train size: ${y_train.length}\n`);

    console.log('--- Test set results ---');
    console.log(`X_test size: ${X_test.length}`);
    console.log(`y_test size: ${y_test.length}\n`);

    console.log('Predictions vs Actual:');
    console.log('Years Exp | Predicted Salary | Actual Salary');
    console.log('-'.repeat(50));
    for (let i = 0; i < X_test.length; i++) {
        console.log(
            `${X_test[i][0].toFixed(1).padStart(9)} | ` +
            `${y_pred[i].toFixed(2).padStart(16)} | ` +
            `${y_test[i].toFixed(2).padStart(13)}`
        );
    }
}

main();
