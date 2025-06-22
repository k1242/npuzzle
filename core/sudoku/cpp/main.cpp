#include "solver.h"
#include <iostream>

int main(int argc, char* argv[]) {
    if (argc != 2) {
        std::cerr << "Usage: " << argv[0] << " <81-char sudoku string>\n";
        return 1;
    }
    
    std::string input(argv[1]);
    if (input.length() != 81) {
        std::cerr << "Error: Input must be exactly 81 characters\n";
        return 1;
    }
    
    SudokuSolver solver(input);
    solver.solve();

    const auto& grid = solver.getGrid();
    const auto& candidates = solver.getCandidates();
    const auto& tech_count = solver.getTechCount();

    // auto val = [&](int id){ return tech_count.contains(id) ? tech_count.at(id) : 0; };
    // std::cout << std::format("{},{},{},{},{},{},{},{}\n", int(isFilled(grid)), val(4), val(5), val(6), val(8), val(12), val(15), val(16), val(17));

    solver.printResults();
    // solver.printCandidates();

    
    return 0;
}