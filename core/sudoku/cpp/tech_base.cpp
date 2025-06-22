#include "solver.h"
#include <algorithm>
#include <bit>

bool SudokuSolver::eliminateBasic() {
    bool changed = false;
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            if (grid[r][c] != 0) continue;
            
            // Eliminate from row, column, box
            for (int i = 0; i < 9; i++) {
                if (grid[r][i] && candidates[r][c][grid[r][i]]) {
                    candidates[r][c][grid[r][i]] = 0;
                    changed = true;
                }
                if (grid[i][c] && candidates[r][c][grid[i][c]]) {
                    candidates[r][c][grid[i][c]] = 0;
                    changed = true;
                }
            }
            
            int br = (r/3)*3, bc = (c/3)*3;
            for (int i = 0; i < 3; i++) {
                for (int j = 0; j < 3; j++) {
                    if (grid[br+i][bc+j] && candidates[r][c][grid[br+i][bc+j]]) {
                        candidates[r][c][grid[br+i][bc+j]] = 0;
                        changed = true;
                    }
                }
            }
        }
    }
    if (changed) tech_count[BASIC_ELIM]++;
    return changed;
}

bool SudokuSolver::checkNakedSingles() {
    bool changed = false;
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            if (grid[r][c] == 0 && candidates[r][c].count() == 1) {
                for (int n = 1; n <= 9; n++) {
                    if (candidates[r][c][n]) {
                        setCell(r, c, n);
                        changed = true;
                        tech_count[NAKED_SINGLE]++;
                        break;
                    }
                }
            }
        }
    }
    return changed;
}

bool SudokuSolver::findHiddenSingles() {
    return processGroups([&](Group& g) {
        bool changed = false;
        for (int n = 1; n <= 9; n++) {
            int pos = -1, cnt = 0;
            for (size_t i = 0; i < g.cells.size(); i++) {
                auto [r, c] = g.cells[i];
                if (grid[r][c] == 0 && candidates[r][c][n]) {
                    pos = i;
                    if (++cnt > 1) break;
                }
            }
            if (cnt == 1) {
                auto [r, c] = g.cells[pos];
                setCell(r, c, n);
                changed = true;
                tech_count[HIDDEN_SINGLE]++;
            }
        }
        return changed;
    });
}

// Generic naked sets finder (pairs, triples, quads)
bool SudokuSolver::findNakedSets(int size, Tech tech) {
    return processGroups([&](Group& g) {
        bool changed = false;
        std::vector<int> empty_cells;
        
        // Collect empty cells with <= size candidates
        for (size_t i = 0; i < g.cells.size(); i++) {
            auto [r, c] = g.cells[i];
            if (grid[r][c] == 0 && candidates[r][c].count() <= size)
                empty_cells.push_back(i);
        }
        
        if (empty_cells.size() < size) return false;
        
        // Try all combinations
        std::vector<int> combo(size);
        std::function<bool(int, int)> tryCombo = [&](int start, int depth) {
            if (depth == size) {
                // Check if union has exactly 'size' candidates
                std::bitset<10> combined;
                for (int idx : combo) {
                    auto [r, c] = g.cells[empty_cells[idx]];
                    combined |= candidates[r][c];
                }
                
                if (combined.count() == size) {
                    // Eliminate from other cells
                    bool found_elim = false;
                    for (auto [r, c] : g.cells) {
                        if (grid[r][c]) continue;
                        bool is_in_set = false;
                        for (int idx : combo) {
                            if (g.cells[empty_cells[idx]] == std::pair{r, c}) {
                                is_in_set = true;
                                break;
                            }
                        }
                        if (!is_in_set) {
                            auto old = candidates[r][c];
                            candidates[r][c] &= ~combined;
                            if (old != candidates[r][c]) found_elim = true;
                        }
                    }
                    if (found_elim) {
                        changed = true;
                        tech_count[tech]++;
                    }
                }
                return false;
            }
            
            for (int i = start; i < empty_cells.size() - (size - depth - 1); i++) {
                combo[depth] = i;
                tryCombo(i + 1, depth + 1);
            }
            return false;
        };
        
        tryCombo(0, 0);
        return changed;
    });
}

bool SudokuSolver::findHiddenPairs() {
    return processGroups([&](Group& g) {
        bool changed = false;
        
        for (int n1 = 1; n1 < 9; n1++) {
            for (int n2 = n1+1; n2 <= 9; n2++) {
                std::vector<int> positions;
                
                // Find cells containing n1 or n2
                for (size_t i = 0; i < g.cells.size(); i++) {
                    auto [r, c] = g.cells[i];
                    if (grid[r][c] == 0 && (candidates[r][c][n1] || candidates[r][c][n2]))
                        positions.push_back(i);
                }
                
                if (positions.size() == 2) {
                    // Check if both cells contain both numbers
                    bool valid = true;
                    for (int pos : positions) {
                        auto [r, c] = g.cells[pos];
                        if (!candidates[r][c][n1] || !candidates[r][c][n2]) {
                            valid = false;
                            break;
                        }
                    }
                    
                    if (valid) {
                        // Check if it's truly hidden (has other candidates)
                        bool is_hidden = false;
                        for (int pos : positions) {
                            auto [r, c] = g.cells[pos];
                            if (candidates[r][c].count() > 2) {
                                is_hidden = true;
                                break;
                            }
                        }
                        
                        if (is_hidden) {
                            // Keep only n1 and n2 in these cells
                            for (int pos : positions) {
                                auto [r, c] = g.cells[pos];
                                auto old = candidates[r][c];
                                candidates[r][c].reset();
                                candidates[r][c][n1] = candidates[r][c][n2] = 1;
                                if (old != candidates[r][c]) changed = true;
                            }
                            if (changed) tech_count[HIDDEN_PAIR]++;
                        }
                    }
                }
            }
        }
        return changed;
    });
}

bool SudokuSolver::findHiddenTriples() {
    return processGroups([&](Group& g) {
        bool changed = false;
        
        // Try all combinations of 3 numbers
        for (int n1 = 1; n1 <= 7; n1++) {
            for (int n2 = n1+1; n2 <= 8; n2++) {
                for (int n3 = n2+1; n3 <= 9; n3++) {
                    std::vector<int> positions;
                    
                    // Find cells containing any of n1, n2, n3
                    for (size_t i = 0; i < g.cells.size(); i++) {
                        auto [r, c] = g.cells[i];
                        if (grid[r][c] == 0 && (candidates[r][c][n1] || candidates[r][c][n2] || candidates[r][c][n3])) {
                            positions.push_back(i);
                        }
                    }
                    
                    // Must be exactly 3 cells for hidden triple
                    if (positions.size() == 3) {
                        // Check if all three numbers are covered in these cells
                        bool has_n1 = false, has_n2 = false, has_n3 = false;
                        for (int pos : positions) {
                            auto [r, c] = g.cells[pos];
                            if (candidates[r][c][n1]) has_n1 = true;
                            if (candidates[r][c][n2]) has_n2 = true;
                            if (candidates[r][c][n3]) has_n3 = true;
                        }
                        
                        if (has_n1 && has_n2 && has_n3) {
                            // Check if it's truly hidden
                            bool is_hidden = false;
                            for (int pos : positions) {
                                auto [r, c] = g.cells[pos];
                                // Count candidates other than n1, n2, n3
                                auto temp = candidates[r][c];
                                temp[n1] = temp[n2] = temp[n3] = 0;
                                if (temp.count() > 0) {
                                    is_hidden = true;
                                    break;
                                }
                            }
                            
                            if (is_hidden) {
                                // Remove all other candidates from these cells
                                bool found_elim = false;
                                for (int pos : positions) {
                                    auto [r, c] = g.cells[pos];
                                    auto old = candidates[r][c];
                                    candidates[r][c].reset();
                                    candidates[r][c][n1] = old[n1];
                                    candidates[r][c][n2] = old[n2];
                                    candidates[r][c][n3] = old[n3];
                                    if (old != candidates[r][c]) found_elim = true;
                                }
                                if (found_elim) {
                                    changed = true;
                                    tech_count[HIDDEN_TRIPLE]++;
                                }
                            }
                        }
                    }
                }
            }
        }
        return changed;
    });
}

bool SudokuSolver::findHiddenQuads() {
    return processGroups([&](Group& g) {
        bool changed = false;
        
        // Try all combinations of 4 numbers
        for (int n1 = 1; n1 <= 6; n1++) {
            for (int n2 = n1+1; n2 <= 7; n2++) {
                for (int n3 = n2+1; n3 <= 8; n3++) {
                    for (int n4 = n3+1; n4 <= 9; n4++) {
                        std::vector<int> positions;
                        
                        // Find cells containing any of n1, n2, n3, n4
                        for (size_t i = 0; i < g.cells.size(); i++) {
                            auto [r, c] = g.cells[i];
                            if (grid[r][c] == 0 && (candidates[r][c][n1] || candidates[r][c][n2] || 
                                                   candidates[r][c][n3] || candidates[r][c][n4])) {
                                positions.push_back(i);
                            }
                        }
                        
                        // Must be exactly 4 cells for hidden quad
                        if (positions.size() == 4) {
                            // Check if all four numbers are covered in these cells
                            bool has_n1 = false, has_n2 = false, has_n3 = false, has_n4 = false;
                            for (int pos : positions) {
                                auto [r, c] = g.cells[pos];
                                if (candidates[r][c][n1]) has_n1 = true;
                                if (candidates[r][c][n2]) has_n2 = true;
                                if (candidates[r][c][n3]) has_n3 = true;
                                if (candidates[r][c][n4]) has_n4 = true;
                            }
                            
                            if (has_n1 && has_n2 && has_n3 && has_n4) {
                                // Check if it's truly hidden
                                bool is_hidden = false;
                                for (int pos : positions) {
                                    auto [r, c] = g.cells[pos];
                                    // Count candidates other than n1, n2, n3, n4
                                    auto temp = candidates[r][c];
                                    temp[n1] = temp[n2] = temp[n3] = temp[n4] = 0;
                                    if (temp.count() > 0) {
                                        is_hidden = true;
                                        break;
                                    }
                                }
                                
                                if (is_hidden) {
                                    // Remove all other candidates from these cells
                                    bool found_elim = false;
                                    for (int pos : positions) {
                                        auto [r, c] = g.cells[pos];
                                        auto old = candidates[r][c];
                                        candidates[r][c].reset();
                                        candidates[r][c][n1] = old[n1];
                                        candidates[r][c][n2] = old[n2];
                                        candidates[r][c][n3] = old[n3];
                                        candidates[r][c][n4] = old[n4];
                                        if (old != candidates[r][c]) found_elim = true;
                                    }
                                    if (found_elim) {
                                        changed = true;
                                        tech_count[HIDDEN_QUAD]++;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return changed;
    });
}

bool SudokuSolver::findIntersectionRemoval() {
    bool changed = false;
    
    // Pointing pairs/triples
    for (int b = 0; b < 9; b++) {
        int br = (b/3)*3, bc = (b%3)*3;
        
        for (int n = 1; n <= 9; n++) {
            // Check if candidates align in row/col
            unsigned int row_mask = 0, col_mask = 0;
            for (auto [r, c] : boxes[b].cells) {
                if (grid[r][c] == 0 && candidates[r][c][n]) {
                    row_mask |= (1 << (r - br));
                    col_mask |= (1 << (c - bc));
                }
            }
            
            // Single row in box
            if (std::popcount(row_mask) == 1) {
                int r = br + std::countr_zero(row_mask);
                for (int c = 0; c < 9; c++) {
                    if (c >= bc && c < bc+3) continue;
                    if (grid[r][c] == 0 && candidates[r][c][n]) {
                        candidates[r][c][n] = 0;
                        changed = true;
                    }
                }
                if (changed) tech_count[POINTING_PAIRS]++;
            }
            
            // Single column in box
            if (std::popcount(col_mask) == 1) {
                int c = bc + std::countr_zero(col_mask);
                for (int r = 0; r < 9; r++) {
                    if (r >= br && r < br+3) continue;
                    if (grid[r][c] == 0 && candidates[r][c][n]) {
                        candidates[r][c][n] = 0;
                        changed = true;
                    }
                }
                if (changed) tech_count[POINTING_PAIRS]++;
            }
        }
    }
    
    // Box-line reduction
    for (int i = 0; i < 9; i++) {
        for (int n = 1; n <= 9; n++) {
            // Check rows
            unsigned int box_mask = 0;
            for (auto [r, c] : rows[i].cells) {
                if (grid[r][c] == 0 && candidates[r][c][n])
                    box_mask |= (1 << (c/3));
            }
            
            if (std::popcount(box_mask) == 1) {
                int box = (i/3)*3 + std::countr_zero(box_mask);
                for (auto [r, c] : boxes[box].cells) {
                    if (r != i && grid[r][c] == 0 && candidates[r][c][n]) {
                        candidates[r][c][n] = 0;
                        changed = true;
                    }
                }
                if (changed) tech_count[BOX_LINE]++;
            }
            
            // Check columns
            box_mask = 0;
            for (auto [r, c] : cols[i].cells) {
                if (grid[r][c] == 0 && candidates[r][c][n])
                    box_mask |= (1 << (r/3));
            }
            
            if (std::popcount(box_mask) == 1) {
                int box = std::countr_zero(box_mask) * 3 + i/3;
                for (auto [r, c] : boxes[box].cells) {
                    if (c != i && grid[r][c] == 0 && candidates[r][c][n]) {
                        candidates[r][c][n] = 0;
                        changed = true;
                    }
                }
                if (changed) tech_count[BOX_LINE]++;
            }
        }
    }
    
    return changed;
}