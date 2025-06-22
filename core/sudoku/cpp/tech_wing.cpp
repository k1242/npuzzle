#include "solver.h"
#include <algorithm>

// Check if two cells can see each other (same row, col, or box)
bool SudokuSolver::canSee(int r1, int c1, int r2, int c2) const {
    return r1 == r2 || c1 == c2 || ((r1/3) == (r2/3) && (c1/3) == (c2/3));
}

// X-Wing: Find rectangle pattern for candidate elimination
bool SudokuSolver::findXWing() {
    bool changed = false;
    
    // Try each candidate number
    for (int n = 1; n <= 9; n++) {
        // Check rows
        for (int r1 = 0; r1 < 8; r1++) {
            std::vector<int> cols1;
            for (int c = 0; c < 9; c++) {
                if (grid[r1][c] == 0 && candidates[r1][c][n])
                    cols1.push_back(c);
            }
            if (cols1.size() != 2) continue;
            
            // Find matching row
            for (int r2 = r1 + 1; r2 < 9; r2++) {
                std::vector<int> cols2;
                for (int c = 0; c < 9; c++) {
                    if (grid[r2][c] == 0 && candidates[r2][c][n])
                        cols2.push_back(c);
                }
                
                // Check if same columns
                if (cols2.size() == 2 && cols1[0] == cols2[0] && cols1[1] == cols2[1]) {
                    // Found X-Wing, eliminate from columns
                    for (int r = 0; r < 9; r++) {
                        if (r != r1 && r != r2) {
                            for (int c : cols1) {
                                if (grid[r][c] == 0 && candidates[r][c][n]) {
                                    candidates[r][c][n] = 0;
                                    changed = true;
                                }
                            }
                        }
                    }
                    if (changed) tech_count[X_WING]++;
                }
            }
        }
        
        // Check columns (same logic, transposed)
        for (int c1 = 0; c1 < 8; c1++) {
            std::vector<int> rows1;
            for (int r = 0; r < 9; r++) {
                if (grid[r][c1] == 0 && candidates[r][c1][n])
                    rows1.push_back(r);
            }
            if (rows1.size() != 2) continue;
            
            for (int c2 = c1 + 1; c2 < 9; c2++) {
                std::vector<int> rows2;
                for (int r = 0; r < 9; r++) {
                    if (grid[r][c2] == 0 && candidates[r][c2][n])
                        rows2.push_back(r);
                }
                
                if (rows2.size() == 2 && rows1[0] == rows2[0] && rows1[1] == rows2[1]) {
                    // Found X-Wing, eliminate from rows
                    bool local_changed = false;
                    for (int c = 0; c < 9; c++) {
                        if (c != c1 && c != c2) {
                            for (int r : rows1) {
                                if (grid[r][c] == 0 && candidates[r][c][n]) {
                                    candidates[r][c][n] = 0;
                                    local_changed = true;
                                }
                            }
                        }
                    }
                    if (local_changed) {
                        changed = true;
                        tech_count[X_WING]++;
                    }
                }
            }
        }
    }
    return changed;
}

// Y-Wing: Find bent triple pattern
bool SudokuSolver::findYWing() {
    bool changed = false;
    
    // Find all bi-value cells
    std::vector<std::tuple<int, int, int, int>> biCells; // r, c, val1, val2
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            if (grid[r][c] == 0 && candidates[r][c].count() == 2) {
                int v1 = 0, v2 = 0;
                for (int n = 1; n <= 9; n++) {
                    if (candidates[r][c][n]) {
                        if (!v1) v1 = n;
                        else v2 = n;
                    }
                }
                biCells.push_back({r, c, v1, v2});
            }
        }
    }
    
    // Try each bi-value cell as pivot
    for (size_t i = 0; i < biCells.size(); i++) {
        auto [pr, pc, pv1, pv2] = biCells[i];
        
        // Find two wings that share one value each with pivot
        for (size_t j = 0; j < biCells.size(); j++) {
            if (i == j) continue;
            auto [wr1, wc1, wv1, wv2] = biCells[j];
            if (!canSee(pr, pc, wr1, wc1)) continue;
            
            // Check if shares exactly one value with pivot
            int shared1 = 0;
            if ((wv1 == pv1 || wv1 == pv2) && (wv2 != pv1 && wv2 != pv2)) shared1 = wv1;
            else if ((wv2 == pv1 || wv2 == pv2) && (wv1 != pv1 && wv1 != pv2)) shared1 = wv2;
            else continue;
            
            int other1 = (wv1 == shared1) ? wv2 : wv1;
            
            for (size_t k = j + 1; k < biCells.size(); k++) {
                if (i == k) continue;
                auto [wr2, wc2, wv3, wv4] = biCells[k];
                if (!canSee(pr, pc, wr2, wc2)) continue;
                
                // Check if shares exactly one value with pivot
                int shared2 = 0;
                if ((wv3 == pv1 || wv3 == pv2) && (wv4 != pv1 && wv4 != pv2)) shared2 = wv3;
                else if ((wv4 == pv1 || wv4 == pv2) && (wv3 != pv1 && wv3 != pv2)) shared2 = wv4;
                else continue;
                
                if (shared1 == shared2) continue; // Must share different values
                
                int other2 = (wv3 == shared2) ? wv4 : wv3;
                
                // Check if wings share common value
                if (other1 == other2) {
                    // Found Y-Wing! Eliminate common value from cells seeing both wings
                    bool local_changed = false;
                    for (int r = 0; r < 9; r++) {
                        for (int c = 0; c < 9; c++) {
                            if (grid[r][c] == 0 && candidates[r][c][other1] &&
                                canSee(r, c, wr1, wc1) && canSee(r, c, wr2, wc2) &&
                                !(r == pr && c == pc) && !(r == wr1 && c == wc1) && !(r == wr2 && c == wc2)) {
                                candidates[r][c][other1] = 0;
                                local_changed = true;
                            }
                        }
                    }
                    if (local_changed) {
                        changed = true;
                        tech_count[Y_WING]++;
                    };
                }
            }
        }
    }
    return changed;
}

// XYZ-Wing: Extended Y-Wing with tri-value pivot
bool SudokuSolver::findXYZWing() {
    bool changed = false;
    
    // Find all cells with exactly 3 candidates (pivots)
    for (int pr = 0; pr < 9; pr++) {
        for (int pc = 0; pc < 9; pc++) {
            if (grid[pr][pc] || candidates[pr][pc].count() != 3) continue;
            
            // Find all bi-value cells that can see pivot
            for (int r1 = 0; r1 < 9; r1++) {
                for (int c1 = 0; c1 < 9; c1++) {
                    if ((r1 == pr && c1 == pc) || grid[r1][c1]) continue;
                    if (candidates[r1][c1].count() != 2 || !canSee(pr, pc, r1, c1)) continue;
                    
                    // Check if wing1 shares exactly 2 values with pivot
                    auto shared1 = candidates[r1][c1] & candidates[pr][pc];
                    if (shared1.count() != 2) continue;
                    
                    // Find second wing
                    for (int r2 = 0; r2 < 9; r2++) {
                        for (int c2 = 0; c2 < 9; c2++) {
                            if ((r2 == pr && c2 == pc) || (r2 == r1 && c2 == c1)) continue;
                            if (grid[r2][c2] || candidates[r2][c2].count() != 2) continue;
                            if (!canSee(pr, pc, r2, c2)) continue;
                            
                            // Check if wing2 shares exactly 2 values with pivot
                            auto shared2 = candidates[r2][c2] & candidates[pr][pc];
                            if (shared2.count() != 2) continue;
                            
                            // Check that wings have exactly 1 common candidate
                            auto common = candidates[r1][c1] & candidates[r2][c2];
                            if (common.count() != 1) continue;
                            
                            // Check that together wings cover all pivot candidates
                            if ((candidates[r1][c1] | candidates[r2][c2]) != candidates[pr][pc]) continue;
                            
                            // Extract common candidate
                            int z = 0;
                            for (int n = 1; n <= 9; n++) {
                                if (common[n]) { z = n; break; }
                            }
                            
                            // Found valid XYZ-Wing! Eliminate z from cells seeing all three
                            bool local_changed = false;
                            for (int r = 0; r < 9; r++) {
                                for (int c = 0; c < 9; c++) {
                                    if (grid[r][c] == 0 && candidates[r][c][z] &&
                                        canSee(r, c, pr, pc) && canSee(r, c, r1, c1) && 
                                        canSee(r, c, r2, c2) &&
                                        !(r == pr && c == pc) && !(r == r1 && c == c1) && 
                                        !(r == r2 && c == c2)) {
                                        candidates[r][c][z] = 0;
                                        local_changed = true;
                                    }
                                }
                            }
                            if (local_changed) {
                                changed = true;
                                tech_count[XYZ_WING]++;
                            }
                        }
                    }
                }
            }
        }
    }
    return changed;
}