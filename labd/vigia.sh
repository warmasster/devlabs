#!/bin/sh
# Vigía de relavops. Vive dentro del nodo mientras dura la sesión (ver vigia.go).
# labd le manda cada script una vez:  D <número> <líneas>  y debajo las líneas.
# Y en cada ronda los que tocan:      R <marca> <número> <número>...
# Cada script corre en una subshell y acaba con  \n\036<marca> <número> <código>
# La ronda acaba con  \036<marca> F
# Las variables llevan __dl_ delante para no pisar las de las comprobaciones.
while IFS=' ' read -r __dl_o __dl_a __dl_b; do
  case $__dl_o in
  D)
    __dl_s=; __dl_i=0
    while [ "$__dl_i" -lt "$__dl_b" ] && IFS= read -r __dl_l; do
      __dl_s="$__dl_s$__dl_l
"
      __dl_i=$((__dl_i + 1))
    done
    eval "__dl_s$__dl_a=\$__dl_s" ;;
  R)
    for __dl_n in $__dl_b; do
      eval "__dl_x=\$__dl_s$__dl_n"
      ( eval "$__dl_x" ) </dev/null 2>&1
      printf '\n\036%s %s %s\n' "$__dl_a" "$__dl_n" "$?"
    done
    printf '\036%s F\n' "$__dl_a" ;;
  esac
done
