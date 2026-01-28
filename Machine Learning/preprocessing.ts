import * as fs from 'fs';
import * as Papa from 'papaparse';

// Train-test split function
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
    
    // Create indices array
    let indices = Array.from({ length: n_samples }, (_, i) => i);
    
    // Shuffle with seed if provided
    if (randomState !== undefined) {
        indices = seededShuffle(indices, randomState);
    } else {
        indices = shuffle(indices);
    }
    
    // Split indices
    const train_indices = indices.slice(0, n_train);
    const test_indices = indices.slice(n_train);
    
    // Split data
    const X_train = train_indices.map(i => X[i]);
    const X_test = test_indices.map(i => X[i]);
    const y_train = train_indices.map(i => y[i]);
    const y_test = test_indices.map(i => y[i]);
    
    return { X_train, X_test, y_train, y_test };
}

// Seeded random shuffle (for reproducibility)
function seededShuffle<T>(array: T[], seed: number): T[] {
    const arr = [...array];
    const random = seededRandom(seed);
    
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    
    return arr;
}

// Regular shuffle
function shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Seeded random number generator
function seededRandom(seed: number): () => number {
    let state = seed;
    return function() {
        state = (state * 1664525 + 1013904223) % 4294967296;
        return state / 4294967296;
    };
}

// ============================================
// Option 2: Using PapaParse (lightweight)
// ============================================

async function mainWithPapaParse() {
    const csvFile = fs.readFileSync('C:\\Users\\SriniAchuthan\\OneDrive\\Desktop\\Machine-Learning-A-Z-Codes-Datasets\\Machine Learning A-Z\\Part 1 - Data Preprocessing\\Section 2 -------------------- Part 1 - Data Preprocessing --------------------\\Python\\Data.csv', 'utf8');
    
    const parsed = Papa.parse(csvFile, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });
    
    const data = parsed.data as any[];
    const columns = Object.keys(data[0]);
    
    // Extract X (all columns except last)
    const X = data.map(row => 
        columns.slice(0, -1).map(col => row[col])
    );
    
    // Extract y (last column)
    const y = data.map(row => row[columns[columns.length - 1]]);
    
    // Split the dataset
    const { X_train, X_test, y_train, y_test } = trainTestSplit(
        X, 
        y, 
        0.2, 
        0
    );
    
    console.log('X_train shape:', X_train.length, 'x', X_train[0].length);
    console.log('X_test shape:', X_test.length, 'x', X_test[0].length);
    console.log('y_train length:', y_train.length);
    console.log('y_test length:', y_test.length);
}

// ============================================
// Option 3: Manual CSV parsing
// ============================================

function readCSV(filename: string): { X: number[][], y: number[] } {
    const csvContent = fs.readFileSync(filename, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header
    const dataLines = lines.slice(1);
    
    const data = dataLines.map(line => {
        return line.split(',').map(val => parseFloat(val.trim()));
    });
    
    // Extract X and y
    const X = data.map(row => row.slice(0, -1));
    const y = data.map(row => row[row.length - 1]);
    
    return { X, y };
}

// Run the main function
mainWithPapaParse().catch(console.error);
