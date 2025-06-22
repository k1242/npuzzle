#include "solver.h"
#include <bitset>

// Check if current grid state satisfies sudoku constraints
bool isValid(const std::vector<std::vector<int>>& grid) {
    // Check dimensions
    if (grid.size() != 9) return false;
    for (const auto& row : grid) {
        if (row.size() != 9) return false;
    }
    
    // Check rows
    for (int r = 0; r < 9; r++) {
        std::bitset<10> seen;
        for (int c = 0; c < 9; c++) {
            int val = grid[r][c];
            if (val < 0 || val > 9) return false;
            if (val != 0) {
                if (seen[val]) return false;  // Duplicate in row
                seen[val] = 1;
            }
        }
    }
    
    // Check columns
    for (int c = 0; c < 9; c++) {
        std::bitset<10> seen;
        for (int r = 0; r < 9; r++) {
            int val = grid[r][c];
            if (val != 0) {
                if (seen[val]) return false;  // Duplicate in column
                seen[val] = 1;
            }
        }
    }
    
    // Check 3x3 boxes
    for (int box = 0; box < 9; box++) {
        std::bitset<10> seen;
        int br = (box / 3) * 3;
        int bc = (box % 3) * 3;
        
        for (int i = 0; i < 3; i++) {
            for (int j = 0; j < 3; j++) {
                int val = grid[br + i][bc + j];
                if (val != 0) {
                    if (seen[val]) return false;  // Duplicate in box
                    seen[val] = 1;
                }
            }
        }
    }
    
    return true;
}



bool isFilled(const std::vector<std::vector<int>>& grid) {
    // Check rows
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            int val = grid[r][c];
            if (val == 0) 
                return false;
        }
    }
       
    return true;
}