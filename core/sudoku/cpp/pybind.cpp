#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "solver.h"

namespace py = pybind11;

PYBIND11_MODULE(hsolve, m) {
    m.doc() = "Sudoku Solver with advanced techniques";

    m.def("hsolve", [](const std::string& puzzle, bool return_grid = false) -> py::object {
        SudokuSolver solver(puzzle);
        solver.solve();
        
        auto grid = solver.getGrid();
        auto tech_count = solver.getTechCount();
        
        // Build stats vector
        auto val = [&](int id){ return tech_count.contains(id) ? tech_count.at(id) : 0; };
        std::vector<int> stats = {
            int(isFilled(grid)), val(4), val(5), val(6), 
            val(8), val(12), val(15), val(16), val(17)
        };
        
        if (return_grid) {
            return py::make_tuple(stats, grid);
        }
        return py::cast(stats);
    }, 
    py::arg("puzzle"), 
    py::arg("return_grid") = false,
    "Solve sudoku and return stats list (is_filled, naked_pair, hidden_pair, naked_triple, "
    "naked_quad, x_wing, y_wing, rectangle_elim, xyz_wing) or tuple (stats, grid) if return_grid=True");
    
    // Utility functions
    m.def("is_valid", &isValid, py::arg("grid"),
          "Check if grid satisfies sudoku constraints");
    m.def("is_filled", &isFilled, py::arg("grid"),
          "Check if grid is completely filled");
}