```
cd web
scp -r ./* root@qdiag.xyz:/var/www/qdiag.xyz/
scp -r ./dino root@qdiag.xyz:/var/www/qdiag.xyz/
scp -r ./_sudoku root@qdiag.xyz:/var/www/qdiag.xyz/
scp -r ./sudoku root@qdiag.xyz:/var/www/qdiag.xyz/
```

```
cd back/sudoku-back/
scp server.js rooms.js gameState.js package.json root@qdiag.xyz:/var/www/sudoku-backend/
```


```
cd deploy
scp qdiag.xyz root@qdiag.xyz:/etc/nginx/sites-available/
```