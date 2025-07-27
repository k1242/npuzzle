g++ -std=c++20 -o solver main.cpp solver.cpp tech_base.cpp tech_recelim.cpp tech_wing.cpp tech_coloring_single.cpp utils.cpp

solver "000450120805219300000080509053000060000007095087600000230060000008001650060800001" 



g++ -std=c++20 -Ofast -o bsolver main-batch.cpp solver.cpp tech_base.cpp tech_wing.cpp tech_coloring.cpp utils.cpp

g++ -std=c++20 -Ofast -o bsolver main-batch.cpp solver.cpp tech_base.cpp tech_wing.cpp tech_coloring.cpp tech_chains.cpp utils.cpp

g++ -std=c++20 -Ofast -o bsolver main-batch.cpp solver.cpp tech_base.cpp tech_wing.cpp tech_recelim.cpp utils.cpp

g++ -std=c++20 -Ofast -o bsolver main-batch.cpp solver.cpp tech_base.cpp tech_recelim.cpp tech_wing.cpp tech_coloring_single.cpp tech_coloring.cpp utils.cpp

bsolver ..\..\..\data\sudoku\puzzles.txt
bsolver ..\..\..\data\sudoku\raw.txt  