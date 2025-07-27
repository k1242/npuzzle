#include "solver.h"
#include <algorithm>
#include <vector>

bool SudokuSolver::findSingleColoring() {
    bool changed = false;
    
    // Try each digit
    for (int digit = 1; digit <= 9; digit++) {
        // Try each cell where digit is a candidate
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (grid[r][c] != 0 || !candidates[r][c][digit]) continue;
                
                // Test hypothesis: digit at (r,c)
                if (testColoringHypothesis(r, c, digit)) {
                    // Found contradiction - eliminate candidate
                    candidates[r][c][digit] = 0;
                    changed = true;
                    tech_count[SINGLE_COLORING]++;
                }
            }
        }
    }
    
    return changed;
}

bool SudokuSolver::testColoringHypothesis(int hr, int hc, int digit) {
    // Create copies of current state
    auto gridCopy = grid;
    auto candidatesCopy = candidates;
    
    // Set hypothesis cell
    gridCopy[hr][hc] = digit;
    candidatesCopy[hr][hc].reset();
    
    // Eliminate from groups containing hypothesis cell
    for (int i = 0; i < 9; i++) {
        if (i != hc) candidatesCopy[hr][i][digit] = 0;  // Row
        if (i != hr) candidatesCopy[i][hc][digit] = 0;  // Column
    }
    
    // Box elimination
    int br = (hr/3)*3, bc = (hc/3)*3;
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3; j++) {
            if (br+i != hr || bc+j != hc) {
                candidatesCopy[br+i][bc+j][digit] = 0;
            }
        }
    }
    
    // Propagate using single-digit techniques
    bool changed = true;
    while (changed) {
        changed = false;
        
        // Check for contradictions first
        if (hasContradiction(gridCopy, candidatesCopy, digit)) {
            return true;  // Hypothesis leads to contradiction
        }
        
        // Naked singles for this digit
        for (int r = 0; r < 9; r++) {
            for (int c = 0; c < 9; c++) {
                if (gridCopy[r][c] == 0 && candidatesCopy[r][c].count() == 1 && candidatesCopy[r][c][digit]) {
                    // Place digit
                    gridCopy[r][c] = digit;
                    candidatesCopy[r][c].reset();
                    
                    // Eliminate from groups
                    for (int i = 0; i < 9; i++) {
                        if (i != c) candidatesCopy[r][i][digit] = 0;
                        if (i != r) candidatesCopy[i][c][digit] = 0;
                    }
                    
                    int boxR = (r/3)*3, boxC = (c/3)*3;
                    for (int i = 0; i < 3; i++) {
                        for (int j = 0; j < 3; j++) {
                            if (boxR+i != r || boxC+j != c) {
                                candidatesCopy[boxR+i][boxC+j][digit] = 0;
                            }
                        }
                    }
                    
                    changed = true;
                }
            }
        }
        
        // Hidden singles for this digit
        // Check rows
        for (int r = 0; r < 9; r++) {
            int count = 0, lastC = -1;
            bool hasDigit = false;
            
            for (int c = 0; c < 9; c++) {
                if (gridCopy[r][c] == digit) {
                    hasDigit = true;
                    break;
                }
                if (gridCopy[r][c] == 0 && candidatesCopy[r][c][digit]) {
                    count++;
                    lastC = c;
                }
            }
            
            if (!hasDigit && count == 1) {
                // Place digit
                gridCopy[r][lastC] = digit;
                candidatesCopy[r][lastC].reset();
                
                // Eliminate from column and box
                for (int i = 0; i < 9; i++) {
                    if (i != r) candidatesCopy[i][lastC][digit] = 0;
                }
                
                int boxR = (r/3)*3, boxC = (lastC/3)*3;
                for (int i = 0; i < 3; i++) {
                    for (int j = 0; j < 3; j++) {
                        if (boxR+i != r || boxC+j != lastC) {
                            candidatesCopy[boxR+i][boxC+j][digit] = 0;
                        }
                    }
                }
                
                changed = true;
            }
        }
        
        // Check columns
        for (int c = 0; c < 9; c++) {
            int count = 0, lastR = -1;
            bool hasDigit = false;
            
            for (int r = 0; r < 9; r++) {
                if (gridCopy[r][c] == digit) {
                    hasDigit = true;
                    break;
                }
                if (gridCopy[r][c] == 0 && candidatesCopy[r][c][digit]) {
                    count++;
                    lastR = r;
                }
            }
            
            if (!hasDigit && count == 1) {
                // Place digit
                gridCopy[lastR][c] = digit;
                candidatesCopy[lastR][c].reset();
                
                // Eliminate from row and box
                for (int i = 0; i < 9; i++) {
                    if (i != c) candidatesCopy[lastR][i][digit] = 0;
                }
                
                int boxR = (lastR/3)*3, boxC = (c/3)*3;
                for (int i = 0; i < 3; i++) {
                    for (int j = 0; j < 3; j++) {
                        if (boxR+i != lastR || boxC+j != c) {
                            candidatesCopy[boxR+i][boxC+j][digit] = 0;
                        }
                    }
                }
                
                changed = true;
            }
        }
        
        // Check boxes
        for (int box = 0; box < 9; box++) {
            int boxR = (box/3)*3, boxC = (box%3)*3;
            int count = 0, lastR = -1, lastC = -1;
            bool hasDigit = false;
            
            for (int i = 0; i < 3; i++) {
                for (int j = 0; j < 3; j++) {
                    int r = boxR + i, c = boxC + j;
                    if (gridCopy[r][c] == digit) {
                        hasDigit = true;
                        break;
                    }
                    if (gridCopy[r][c] == 0 && candidatesCopy[r][c][digit]) {
                        count++;
                        lastR = r;
                        lastC = c;
                    }
                }
                if (hasDigit) break;
            }
            
            if (!hasDigit && count == 1) {
                // Place digit
                gridCopy[lastR][lastC] = digit;
                candidatesCopy[lastR][lastC].reset();
                
                // Eliminate from row and column
                for (int i = 0; i < 9; i++) {
                    if (i != lastC) candidatesCopy[lastR][i][digit] = 0;
                    if (i != lastR) candidatesCopy[i][lastC][digit] = 0;
                }
                
                changed = true;
            }
        }
    }
    
    // Final contradiction check
    return hasContradiction(gridCopy, candidatesCopy, digit);
}

bool SudokuSolver::hasContradiction(const std::vector<std::vector<int>>& gridCopy,
                                   const std::vector<std::vector<std::bitset<10>>>& candidatesCopy,
                                   int digit) {
    // Check rows
    for (int r = 0; r < 9; r++) {
        bool hasDigit = false;
        bool hasCandidate = false;
        
        for (int c = 0; c < 9; c++) {
            if (gridCopy[r][c] == digit) {
                hasDigit = true;
                break;
            }
            if (gridCopy[r][c] == 0 && candidatesCopy[r][c][digit]) {
                hasCandidate = true;
            }
        }
        
        if (!hasDigit && !hasCandidate) {
            return true;  // No place for digit in this row
        }
    }
    
    // Check columns
    for (int c = 0; c < 9; c++) {
        bool hasDigit = false;
        bool hasCandidate = false;
        
        for (int r = 0; r < 9; r++) {
            if (gridCopy[r][c] == digit) {
                hasDigit = true;
                break;
            }
            if (gridCopy[r][c] == 0 && candidatesCopy[r][c][digit]) {
                hasCandidate = true;
            }
        }
        
        if (!hasDigit && !hasCandidate) {
            return true;  // No place for digit in this column
        }
    }
    
    // Check boxes
    for (int box = 0; box < 9; box++) {
        int boxR = (box/3)*3, boxC = (box%3)*3;
        bool hasDigit = false;
        bool hasCandidate = false;
        
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                int r = boxR + i, c = boxC + j;
                if (gridCopy[r][c] == digit) {
                    hasDigit = true;
                    break;
                }
                if (gridCopy[r][c] == 0 && candidatesCopy[r][c][digit]) {
                    hasCandidate = true;
                }
            }
            if (hasDigit) break;
        }
        
        if (!hasDigit && !hasCandidate) {
            return true;  // No place for digit in this box
        }
    }
    
    return false;  // No contradiction found
}