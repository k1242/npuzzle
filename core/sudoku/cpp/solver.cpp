#include "solver.h"
#include <iostream>
#include <algorithm>

const char* SudokuSolver::tech_names[21] = {"", 
    "Basic Elimination", "Naked Single", "Hidden Single",
    "Naked Pair", "Hidden Pair", "Naked Triple", "Hidden Triple", "Naked Quad", "Hidden Quad", "Pointing Pairs", "Box-Line Reduction",
    "X-Wing", "Chute Remote Pairs", "Swordfish", "Y-Wing", "Rectangle Elimination", "XYZ-Wing", 
    "Jellyfish", "Simple Coloring", "X-Cycles"
};

SudokuSolver::SudokuSolver(const std::string& input) : grid(9, std::vector<int>(9)), 
                                                       candidates(9, std::vector<std::bitset<10>>(9)),
                                                       rows(9), cols(9), boxes(9) {
    // Parse input
    for (int i = 0; i < 81; i++) {
        grid[i/9][i%9] = input[i] - '0';
    }
    
    // Initialize candidates and groups
    for (int r = 0; r < 9; r++) {
        for (int c = 0; c < 9; c++) {
            if (grid[r][c] == 0) {
                candidates[r][c].set();
                candidates[r][c][0] = 0;
            }
            // Build group structures
            rows[r].cells.push_back({r, c});
            cols[c].cells.push_back({r, c});
            boxes[(r/3)*3 + c/3].cells.push_back({r, c});
        }
    }
    eliminateBasic();
}

void SudokuSolver::solve() {
    bool changed = true;
    while (changed) {
        changed = eliminateBasic() 
                  || checkNakedSingles()
                  || findHiddenSingles()
                  || findNakedSets(2, NAKED_PAIR)
                  || findHiddenPairs()
                  || findNakedSets(3, NAKED_TRIPLE)
                  || findNakedSets(4, NAKED_QUAD) 
                  || findIntersectionRemoval()
                  || findXWing()
                  || findYWing()
                  || findRectangleElimination()
                  || findXYZWing()
                  // || findChuteRemotePairs() // not working ?
                  // || findSwordfish()
                  // || findJellyfish()
                  // || findHiddenTriples() // long eval, not so impactful
                  // || findHiddenQuads() // long eval, not so impactful
                  // || findSimpleColoring()
                  // || findXCycles()
                  ;
    }
}

void SudokuSolver::printResults() const {
    std::cout << "Used techniques:\n";
    for (const auto& [t, cnt] : tech_count) {
        std::cout << "- " << tech_names[t] << ": " << cnt << "\n";
    }
    
    std::cout << "\nFinal grid:\n";
    for (int r = 0; r < 9; r++) {
        if (r % 3 == 0 && r) std::cout << "------+-------+------\n";
        for (int c = 0; c < 9; c++) {
            if (c % 3 == 0 && c) std::cout << "| ";
            std::cout << (grid[r][c] ? char('0' + grid[r][c]) : '.') << ' ';
        }
        std::cout << '\n';
    }
    
    int filled = 0;
    for (const auto& row : grid)
        filled += std::count_if(row.begin(), row.end(), [](int x){ return x != 0; });
    std::cout << "\nFilled: " << filled << "/81\n";
}

void SudokuSolver::printCandidates() const {
    std::cout << "Candidates:\n";
    for (size_t r = 0; r < candidates.size(); ++r) {
        for (size_t c = 0; c < candidates[r].size(); ++c) {
            const auto& bs = candidates[r][c];
            for (int bit = static_cast<int>(bs.size()) - 1; bit >= 0; --bit)
                std::cout << bs[bit] << ' ';
            std::cout << "| " << grid[r][c] << '\n';
        }
    }
}

void SudokuSolver::setCell(int r, int c, int n) {
    grid[r][c] = n;
    candidates[r][c].reset();
    
    // Eliminate from all groups containing this cell
    for (auto [rr, cc] : rows[r].cells) candidates[rr][cc][n] = 0;
    for (auto [rr, cc] : cols[c].cells) candidates[rr][cc][n] = 0;
    for (auto [rr, cc] : boxes[(r/3)*3 + c/3].cells) candidates[rr][cc][n] = 0;
}