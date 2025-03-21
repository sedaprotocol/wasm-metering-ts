(module
  ;; Import memory from the environment
  (import "env" "memory" (memory 1))

  ;; Function to write a value to memory at a specific index
  (func $writeToMemory (param $index i32) (param $value i32)
    (i32.store
      (local.get $index)
      (local.get $value)
    )
  )

  ;; Export the function so it can be called externally
  (export "writeToMemory" (func $writeToMemory))
)
