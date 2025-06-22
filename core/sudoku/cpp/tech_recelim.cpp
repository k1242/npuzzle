#include "solver.h"
#include <algorithm>
#include <vector>

bool SudokuSolver::findRectangleElimination() {
    bool changed = false;
    
    // Try each candidate number
    for (int n = 1; n <= 9; n++) {
        // Find hinge cells
        for (int hr = 0; hr < 9; hr++) {
            for (int hc = 0; hc < 9; hc++) {
                if (grid[hr][hc] != 0 || !candidates[hr][hc][n]) continue;
                
                // === Pattern 1: Strong link in row, weak link in column ===
                // Count candidates in row
                int strongCol = -1;
                int rowCount = 0;
                for (int c = 0; c < 9; c++) {
                    if (grid[hr][c] == 0 && candidates[hr][c][n]) {
                        if (c != hc) strongCol = c;
                        rowCount++;
                    }
                }
                
                // Check if we have exactly 2 candidates (strong link)
                if (rowCount == 2 && strongCol != -1) {
                    // Look for weak link in column (more than 2)
                    for (int wr = 0; wr < 9; wr++) {
                        if (wr == hr) continue;
                        if (grid[wr][hc] != 0 || !candidates[wr][hc][n]) continue;
                        
                        // Check if weak link exists (more than 2 in column)
                        int colCount = 0;
                        for (int r = 0; r < 9; r++) {
                            if (grid[r][hc] == 0 && candidates[r][hc][n]) colCount++;
                        }
                        if (colCount <= 2) continue; // Not a weak link
                        
                        // Calculate box numbers
                        int hingeBox = (hr/3)*3 + (hc/3);
                        int weakBox = (wr/3)*3 + (hc/3);
                        int strongBox = (hr/3)*3 + (strongCol/3);
                        int fourthBox = (wr/3)*3 + (strongCol/3);
                        
                        // All four boxes must be different for valid rectangle
                        if (hingeBox == weakBox || hingeBox == strongBox || hingeBox == fourthBox) continue;
                        if (weakBox == strongBox || weakBox == fourthBox) continue;
                        if (strongBox == fourthBox) continue;
                        
                        // Check fourth box
                        bool hasCandidate = false;
                        bool allEliminated = true;
                        
                        int boxR = (wr/3)*3;
                        int boxC = (strongCol/3)*3;
                        
                        for (int r = boxR; r < boxR + 3; r++) {
                            for (int c = boxC; c < boxC + 3; c++) {
                                if (grid[r][c] == 0 && candidates[r][c][n]) {
                                    hasCandidate = true;
                                    // Survives only if not on weak wing's row AND not on strong wing's column
                                    if (r != wr && c != strongCol) {
                                        allEliminated = false;
                                        break;
                                    }
                                }
                            }
                            if (!allEliminated) break;
                        }
                        
                        // Can eliminate weak wing candidate if all would be eliminated
                        if (hasCandidate && allEliminated && candidates[wr][hc].count() > 1) {
                            candidates[wr][hc][n] = 0;
                            changed = true;
                            tech_count[RECTANGLE_ELIM]++;
                        }
                    }
                }
                
                // === Pattern 2: Strong link in column, weak link in row ===
                // Count candidates in column
                int strongRow = -1;
                int colCount = 0;
                for (int r = 0; r < 9; r++) {
                    if (grid[r][hc] == 0 && candidates[r][hc][n]) {
                        if (r != hr) strongRow = r;
                        colCount++;
                    }
                }
                
                // Check if we have exactly 2 candidates (strong link)
                if (colCount == 2 && strongRow != -1) {
                    // Look for weak link in row (more than 2)
                    for (int wc = 0; wc < 9; wc++) {
                        if (wc == hc) continue;
                        if (grid[hr][wc] != 0 || !candidates[hr][wc][n]) continue;
                        
                        // Check if weak link exists (more than 2 in row)
                        int rowCount2 = 0;
                        for (int c = 0; c < 9; c++) {
                            if (grid[hr][c] == 0 && candidates[hr][c][n]) rowCount2++;
                        }
                        if (rowCount2 <= 2) continue; // Not a weak link
                        
                        // Calculate box numbers
                        int hingeBox = (hr/3)*3 + (hc/3);
                        int weakBox = (hr/3)*3 + (wc/3);
                        int strongBox = (strongRow/3)*3 + (hc/3);
                        int fourthBox = (strongRow/3)*3 + (wc/3);
                        
                        // All four boxes must be different for valid rectangle
                        if (hingeBox == weakBox || hingeBox == strongBox || hingeBox == fourthBox) continue;
                        if (weakBox == strongBox || weakBox == fourthBox) continue;
                        if (strongBox == fourthBox) continue;
                        
                        // Check fourth box
                        bool hasCandidate = false;
                        bool allEliminated = true;
                        
                        int boxR = (strongRow/3)*3;
                        int boxC = (wc/3)*3;
                        
                        for (int r = boxR; r < boxR + 3; r++) {
                            for (int c = boxC; c < boxC + 3; c++) {
                                if (grid[r][c] == 0 && candidates[r][c][n]) {
                                    hasCandidate = true;
                                    // Survives only if not on strong wing's row AND not on weak wing's column
                                    if (r != strongRow && c != wc) {
                                        allEliminated = false;
                                        break;
                                    }
                                }
                            }
                            if (!allEliminated) break;
                        }
                        
                        // Can eliminate weak wing candidate if all would be eliminated
                        if (hasCandidate && allEliminated && candidates[hr][wc].count() > 1) {
                            candidates[hr][wc][n] = 0;
                            changed = true;
                            tech_count[RECTANGLE_ELIM]++;
                        }
                    }
                }
                
                // === Two Strong Links Pattern ===
                // Check if hinge has strong links in both row and column
                if (rowCount == 2 && colCount == 2 && strongRow != -1 && strongCol != -1) {
                    // Wings: (hr, strongCol) and (strongRow, hc)
                    // If either wing is ON, both must be ON (through the hinge being OFF)
                    // Check if this would eliminate all candidates from any box
                    
                    for (int b = 0; b < 9; b++) {
                        int boxR = (b/3)*3;
                        int boxC = (b%3)*3;
                        
                        // Skip boxes containing hinge or wings
                        int hingeBox = (hr/3)*3 + (hc/3);
                        int wing1Box = (hr/3)*3 + (strongCol/3);
                        int wing2Box = (strongRow/3)*3 + (hc/3);
                        
                        if (b == hingeBox || b == wing1Box || b == wing2Box) continue;
                        
                        bool hasCandidate = false;
                        bool allEliminated = true;
                        
                        for (int r = boxR; r < boxR + 3; r++) {
                            for (int c = boxC; c < boxC + 3; c++) {
                                if (grid[r][c] == 0 && candidates[r][c][n]) {
                                    hasCandidate = true;
                                    // Would survive if not on either wing's row/column
                                    if (r != hr && c != strongCol && r != strongRow && c != hc) {
                                        allEliminated = false;
                                        break;
                                    }
                                }
                            }
                            if (!allEliminated) break;
                        }
                        
                        // If all candidates in this box would be eliminated, both wings must be OFF
                        if (hasCandidate && allEliminated) {
                            // Eliminate both wings if they have more than one candidate
                            bool eliminated = false;
                            if (candidates[hr][strongCol][n] && candidates[hr][strongCol].count() > 1) {
                                candidates[hr][strongCol][n] = 0;
                                eliminated = true;
                            }
                            if (candidates[strongRow][hc][n] && candidates[strongRow][hc].count() > 1) {
                                candidates[strongRow][hc][n] = 0;
                                eliminated = true;
                            }
                            if (eliminated) {
                                changed = true;
                                tech_count[RECTANGLE_ELIM]++;
                            }
                            break; // One box is enough
                        }
                    }
                }
            }
        }
    }
    
    return changed;
}