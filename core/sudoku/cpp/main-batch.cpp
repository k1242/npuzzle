#include "solver.h"

#include <fstream>
#include <vector>
#include <string>
#include <iostream>
#include <chrono>

#include <format>
#include <map>
#include <algorithm>


int main(int argc, char* argv[]) {
    std::vector<std::string> puzzles;

    std::vector<std::map<int,int>> batch_stats;
    batch_stats.reserve(1012);

    if (argc == 2) {
        std::ifstream fin(argv[1]);
        std::string line;
        while (std::getline(fin, line)) {
            if (line.size() == 81) puzzles.push_back(line);
        }
        if (puzzles.empty()) {
            std::cerr << "No 81-character lines found in file." << std::endl;
            return 1;
        }
    } else {
        std::cerr << "Usage: " << argv[0] << " <file-with-81-char-lines>" << std::endl;
        return 1;
    }

    // Start the timer
    const auto globalStart = std::chrono::steady_clock::now();

    int errorEmptyCandidates = 0;
    int errorWrongSolution = 0;
    int filled = 0;
    int solved = 0;
    for (const auto& p : puzzles) {
        SudokuSolver solver(p);
        solver.solve();

        const auto& grid = solver.getGrid();
        const auto& candidates = solver.getCandidates();
        const auto& tech_count = solver.getTechCount();

        // check for empty candidates error
        bool checkEmptyCandidates = false;
        for (int r = 0; r < 9; ++r) {
            for (int c = 0; c < 9; ++c) {
                if (candidates[r][c].count() == 0 && grid[r][c] == 0) {
                    checkEmptyCandidates = true;
                }
            }
        }
        if (checkEmptyCandidates) {
            errorEmptyCandidates++;
        }

        // check if grid is filled
        if (isFilled(grid)) {
            filled++;
            if (isValid(grid)) {
                solved++;
            } else {
                errorWrongSolution++;
            }
        }

        // save tech statistics
        batch_stats.emplace_back(tech_count);
    }

    // Stop the timer
    const auto globalEnd = std::chrono::steady_clock::now();
    const std::chrono::duration<double> elapsed = globalEnd - globalStart; // in seconds

    // Accumulate tech statistics
    std::vector<int> total(21, 0);
    for (const auto& m : batch_stats)
        for (auto [id, cnt] : m)
            total[id] += cnt;

    std::vector<std::pair<int, int>> ordered;
    for (std::size_t id = 0; id < total.size(); ++id)
        // if (total[id] != 0)
        ordered.emplace_back(static_cast<int>(id), total[id]);
    std::stable_sort(ordered.begin(), ordered.end(),
                     [](auto& a, auto& b) { return a.second > b.second; });

    // Print results
    std::cout << "\nErrors: " << std::endl 
              << "    Empty Candidates        " << errorEmptyCandidates << std::endl
              << "    Wrong Solution          " << errorWrongSolution 
              << std::endl;
    std::cout << "\nSolved:" << std::endl
              << "                            " << solved << "/" << puzzles.size() << std::endl;
    std::cout << "\nUsed:"  << std::endl;
    for (auto [id, cnt] : ordered) {
        std::cout << std::format("    {0:<{1}} {2}\n", SudokuSolver::tech_names[id], 23, cnt);
    }

    std::cout << std::format("\nFinished in {:.2f}s\n", elapsed.count());
    return 0;
}
