import { useSelector } from "react-redux";
import { useRef, useState, useEffect } from "react";
import axios from "axios";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { app } from "../firebase";
import {
  updateUserStart,
  updateUserFailure,
  updateUserSuccess,
  deleteUserFailure,
  deleteUserSuccess,
  deleteUserStart,
  signoutUserFailure,
  signoutUserSuccess,
  signoutUserStart,
} from "../redux/User/userSlice";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const dispatch = useDispatch();
  const { currentUser, loading, error } = useSelector((state) => state.user);
  const fileRef = useRef(null);
  const [file, setFile] = useState(undefined);
  const [filePerc, setFilePerc] = useState(0);
  const [fileUploadError, setFileUploadError] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [formData, setFormData] = useState({
    username: currentUser.username || "",
    email: currentUser.email || "",
    password: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (file) {
      handleFileUpload(file);
    }
  }, [file]);

  const handleFileUpload = (file) => {
    const storage = getStorage(app);
    const fileName = new Date().getTime() + file.name;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setFilePerc(Math.round(progress));
      },
      (error) => {
        setFileUploadError(true);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) =>
          setFormData({ ...formData, avatar: downloadURL })
        );
      }
    );
  };

  const deleteUserHandler = async () => {
    try {
      dispatch(deleteUserStart());
      const res = await axios.post(
        `http://localhost:3000/user/delete/${currentUser._id}`,
        {},
        {
          withCredentials: true,
        }
      );

      if (res.data.success === false) {
        dispatch(deleteUserFailure(res.data.message));
        return;
      }

      dispatch(deleteUserSuccess(res.data));
      navigate("/sign-in");
    } catch (err) {
      dispatch(deleteUserFailure(err.response?.data?.message || err.message));
    }
  };

  const handleLogout = async () => {
    try {
      dispatch(signoutUserStart());
      const res = await axios.get(`http://localhost:3000/api/auth/signout`, {
        withCredentials: true,
      });

      if (res.data.success === false) {
        dispatch(signoutUserFailure(res.data.message));
        return;
      }

      dispatch(signoutUserSuccess(res.data));
      navigate("/sign-in");
    } catch (err) {
      dispatch(signoutUserFailure(err.response?.data?.message || err.message));
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      dispatch(updateUserStart());
      const res = await axios.post(
        `http://localhost:3000/user/update/${currentUser._id}`,
        formData,
        {
          withCredentials: true,
        }
      );

      dispatch(updateUserSuccess(res.data));
      setUpdateSuccess(true);
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 5000);
    } catch (error) {
      dispatch(
        updateUserFailure(error.response?.data?.message || error.message)
      );
    }
  };

  return (
    <div className="p-3 max-w-lg mx-auto">
      <h1 className="text-3xl font-semibold text-center my-7">Profile</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <img
          src={formData.avatar || currentUser.avatar}
          alt="profile"
          className="rounded-full h-24 w-24 object-cover cursor-pointer self-center mt-2"
          onClick={() => fileRef.current.click()}
        />
        <input
          onChange={(e) => setFile(e.target.files[0])}
          type="file"
          ref={fileRef}
          hidden
          accept="image/*"
        />
        <p className="text-sm self-center">
          {fileUploadError ? (
            <span className="text-red-700">
              Error uploading image (image must be less than 2 MB)
            </span>
          ) : filePerc > 0 && filePerc < 100 ? (
            <span className="text-slate-700">{`Uploading ${filePerc}%`}</span>
          ) : filePerc === 100 ? (
            <span className="text-green-700">Image successfully uploaded!</span>
          ) : (
            ""
          )}
        </p>
        <input
          type="text"
          placeholder="username"
          id="username"
          className="border p-3 rounded-lg"
          value={formData.username}
          onChange={handleChange}
        />
        <input
          type="email"
          placeholder="email"
          id="email"
          className="border p-3 rounded-lg"
          value={formData.email}
          onChange={handleChange}
        />
        <input
          type="password"
          placeholder="password"
          id="password"
          className="border p-3 rounded-lg"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
        <button
          disabled={loading}
          className="bg-slate-700 text-white rounded-lg p-3 uppercase hover:opacity-95 disabled:opacity-80"
        >
          {loading ? "Loading..." : "Update"}
        </button>
      </form>
      <div className="flex justify-between mt-5">
        <span
          className="text-red-700 cursor-pointer"
          onClick={deleteUserHandler}
        >
          Delete account
        </span>
        <span className="text-red-700 cursor-pointer" onClick={handleLogout}>
          Sign out
        </span>
      </div>
      <p className="text-red-700 mt-5">{error ? error : ""}</p>
      <p className="text-green-700">
        {updateSuccess ? "User updated successfully!" : ""}
      </p>
    </div>
  );
}
